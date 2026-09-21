/**
 * Database Service for Telephony Subsystem
 * Connects directly to Aiven Cloud PostgreSQL Database.
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const rawConnectionString = process.env.DATABASE_URL || '';

// Strip ?sslmode query parameters to allow custom rejectUnauthorized: false
const cleanConnectionString = rawConnectionString.split('?')[0];

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error]', err.message);
});

function generateTokenNumber() {
  return 'PDC-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

const db = {
  pool,

  async query(text, params) {
    return await pool.query(text, params);
  },

  async isHealthy() {
    try {
      const res = await pool.query('SELECT 1');
      return res.rowCount > 0;
    } catch {
      return false;
    }
  },

  /**
   * Find farmer and user record by phone (last 10 digits)
   */
  async getFarmerByPhone(phoneNumber) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    const res = await pool.query(`
      SELECT u.id as user_id, u.name, u.phone, f.id as farmer_id, f.farmer_id as farmer_code, f.village, f.district
      FROM users u
      LEFT JOIN farmers f ON f.user_id = u.id
      WHERE RIGHT(u.phone, 10) = $1
      LIMIT 1
    `, [cleanPhone]);

    return res.rows[0] || null;
  },

  /**
   * Find active booking for a farmer by phone
   */
  async getFarmerActiveBooking(phoneNumber) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    const res = await pool.query(`
      SELECT b.id, b.token_number, b.status, b.quantity, b.center_id, b.slot_id, b.crop_id,
             u.name as farmer_name, u.phone as farmer_phone,
             c.name as center_name, c.district as center_district,
             cr.crop_name, s.start_time, s.end_time, s.date as slot_date
      FROM bookings b
      JOIN farmers f ON f.id = b.farmer_id
      JOIN users u ON u.id = f.user_id
      LEFT JOIN procurement_centers c ON c.id = b.center_id
      LEFT JOIN crops cr ON cr.id = b.crop_id
      LEFT JOIN slots s ON s.id = b.slot_id
      WHERE RIGHT(u.phone, 10) = $1
        AND b.status NOT IN ('CANCELLED')
      ORDER BY b.id DESC
      LIMIT 1
    `, [cleanPhone]);

    return res.rows[0] || null;
  },

  /**
   * Count active tokens ahead in queue for a center
   */
  async getTokensAhead(centerId, bookingId) {
    const res = await pool.query(`
      SELECT count(*) as count
      FROM bookings
      WHERE center_id = $1
        AND status IN ('BOOKED', 'ARRIVED', 'WAITING')
        AND id < $2
    `, [centerId, bookingId]);

    return parseInt(res.rows[0]?.count || '0', 10);
  },

  /**
   * Ensures farmer details are entered in users and farmers tables in the database
   */
  async ensureFarmerExists(phoneNumber, extraData = {}) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) return null;

    let farmer = await this.getFarmerByPhone(cleanPhone);
    if (farmer && farmer.farmer_id) {
      return farmer;
    }

    const defaultName = extraData.farmerName || 'రైతు సోదరా';
    const village = extraData.village || 'గ్రామం';
    const district = extraData.district || 'తూర్పు గోదావరి';

    if (!farmer) {
      // 1. Insert into users table
      const userRes = await pool.query(`
        INSERT INTO users (name, phone, hashed_password, role)
        VALUES ($1, $2, $3, 'FARMER')
        ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, phone
      `, [defaultName, cleanPhone, '$2b$12$KisanSevaDefaultHashedPasswordPlaceholder']);

      const userId = userRes.rows[0].id;
      const farmerCode = 'FARMER-' + crypto.randomBytes(4).toString('hex').toUpperCase();

      // 2. Insert into farmers table
      const farmerRes = await pool.query(`
        INSERT INTO farmers (user_id, farmer_id, village, district, land_area)
        VALUES ($1, $2, $3, $4, 5.0)
        ON CONFLICT (user_id) DO UPDATE SET village = EXCLUDED.village
        RETURNING id, farmer_id, user_id
      `, [userId, farmerCode, village, district]);

      farmer = {
        user_id: userId,
        name: userRes.rows[0].name,
        phone: userRes.rows[0].phone,
        farmer_id: farmerRes.rows[0].id,
        farmer_code: farmerCode
      };
      console.log(`[DB Service] Farmer details entered into database: +91 ${cleanPhone} (${defaultName})`);
    } else if (!farmer.farmer_id) {
      const farmerCode = 'FARMER-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const farmerRes = await pool.query(`
        INSERT INTO farmers (user_id, farmer_id, village, district, land_area)
        VALUES ($1, $2, 'గ్రామం', 'తూర్పు గోదావరి', 5.0)
        ON CONFLICT (user_id) DO UPDATE SET village = EXCLUDED.village
        RETURNING id
      `, [farmer.user_id, farmerCode]);
      farmer.farmer_id = farmerRes.rows[0].id;
      console.log(`[DB Service] Linked farmer record created in database for: +91 ${cleanPhone}`);
    }

    return farmer;
  },

  /**
   * Book a slot for farmer in the database & add token_number
   */
  async bookSlot(phoneNumber, extraData = {}) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);

    // 1. Ensure farmer details exist in PostgreSQL database
    const farmer = await this.ensureFarmerExists(cleanPhone, extraData);

    // 2. Select procurement center
    const centerRes = await pool.query(`
      SELECT id, name, district FROM procurement_centers ORDER BY id ASC LIMIT 1
    `);
    const center = centerRes.rows[0] || { id: 1, name: 'First Procurement Center' };

    // 3. Select or create active slot
    const todayStr = new Date().toISOString().split('T')[0];
    let slotRes = await pool.query(`
      SELECT id, start_time, end_time, capacity FROM slots
      WHERE center_id = $1 AND date >= $2
      ORDER BY date ASC, start_time ASC
      LIMIT 1
    `, [center.id, todayStr]);

    let slot = slotRes.rows[0];
    if (!slot) {
      const newSlot = await pool.query(`
        INSERT INTO slots (center_id, date, start_time, end_time, capacity)
        VALUES ($1, $2, '10:00:00', '11:00:00', 50)
        RETURNING id, start_time, end_time, capacity
      `, [center.id, todayStr]);
      slot = newSlot.rows[0];
    }

    // 4. Generate Token & Insert Booking
    const tokenNumber = generateTokenNumber();
    const quantity = extraData.quantity || 30.0;

    const bookingRes = await pool.query(`
      INSERT INTO bookings (
        farmer_id, center_id, slot_id, crop_id, quantity,
        token_number, status, booking_date, checked_in
      ) VALUES ($1, $2, $3, 1, $4, $5, 'BOOKED', $6, false)
      RETURNING id, token_number, booking_date, status
    `, [farmer.farmer_id, center.id, slot.id, quantity, tokenNumber, todayStr]);

    const createdBooking = bookingRes.rows[0];

    // Format slot time
    const slotTime = slot.start_time ? `${slot.start_time.slice(0, 5)} AM` : '10:30 AM';

    console.log(`[DB Service] Created real booking in PostgreSQL: Token ${tokenNumber} for phone ${cleanPhone}`);

    return {
      success: true,
      tokenId: createdBooking.token_number,
      tokenNumber: createdBooking.token_number,
      slotTime,
      mandiName: center.name,
      phoneNumber: cleanPhone,
      farmerName: farmer.name,
      bookingId: createdBooking.id
    };
  },

  /**
   * Assign a re-allocated slot to a farmer & add new token_number in database
   */
  async assignReallocatedSlot({ phoneNumber, farmerName, language, freedTokenId, slotDetails = {} }) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);

    // 1. Ensure farmer details exist in PostgreSQL users and farmers tables
    const farmer = await this.ensureFarmerExists(cleanPhone, { farmerName });

    // 2. Select procurement center
    const centerRes = await pool.query(`
      SELECT id, name, district FROM procurement_centers ORDER BY id ASC LIMIT 1
    `);
    const center = centerRes.rows[0] || { id: 1, name: 'First Procurement Center' };

    // 3. Find or create slot
    const todayStr = new Date().toISOString().split('T')[0];
    let slotRes = await pool.query(`
      SELECT id, start_time, end_time FROM slots
      WHERE center_id = $1 AND date >= $2
      ORDER BY date ASC, start_time ASC
      LIMIT 1
    `, [center.id, todayStr]);

    let slot = slotRes.rows[0];
    if (!slot) {
      const newSlot = await pool.query(`
        INSERT INTO slots (center_id, date, start_time, end_time, capacity)
        VALUES ($1, $2, '11:00:00', '12:00:00', 50)
        RETURNING id, start_time, end_time
      `, [center.id, todayStr]);
      slot = newSlot.rows[0];
    }

    // 4. Generate new real token & insert into bookings table
    const tokenNumber = generateTokenNumber();
    const quantity = 30.0;

    const bookingRes = await pool.query(`
      INSERT INTO bookings (
        farmer_id, center_id, slot_id, crop_id, quantity,
        token_number, status, booking_date, checked_in
      ) VALUES ($1, $2, $3, 1, $4, $5, 'BOOKED', $6, false)
      RETURNING id, token_number, booking_date, status
    `, [farmer.farmer_id, center.id, slot.id, quantity, tokenNumber, todayStr]);

    const createdBooking = bookingRes.rows[0];
    const slotTime = slotDetails.slotTime || (slot.start_time ? `${slot.start_time.slice(0, 5)} AM` : '11:00 AM');
    const mandiName = slotDetails.mandiName || center.name;

    console.log(`[DB Service] Re-allocated slot entered in PostgreSQL: Token ${tokenNumber} for farmer ${farmer.name || cleanPhone}`);

    return {
      success: true,
      tokenId: createdBooking.token_number,
      tokenNumber: createdBooking.token_number,
      slotTime,
      mandiName,
      phoneNumber: cleanPhone,
      farmerName: farmer.name || farmerName,
      bookingId: createdBooking.id
    };
  },

  /**
   * Cancel booking by token or phone
   */
  async cancelSlot(identifier, reason = 'Farmer cancelled via IVR') {
    const cleanId = String(identifier || '').trim();
    let res = await pool.query(`
      UPDATE bookings
      SET status = 'CANCELLED'
      WHERE token_number = $1 OR farmer_id IN (
        SELECT f.id FROM farmers f JOIN users u ON u.id = f.user_id WHERE RIGHT(u.phone, 10) = RIGHT($1, 10)
      )
      RETURNING id, token_number, center_id
    `, [cleanId]);

    return res.rows[0] || null;
  },

  /**
   * Get delayed payments list from real database
   */
  async getDelayedPayments() {
    try {
      const res = await pool.query(`
        SELECT 
          b.id as booking_id,
          b.token_number,
          u.name as farmer_name,
          u.phone as phone_number,
          b.price as amount,
          b.payment_status,
          c.name as center_name,
          b.arrival_time,
          p.total_amount
        FROM bookings b
        JOIN farmers f ON f.id = b.farmer_id
        JOIN users u ON u.id = f.user_id
        LEFT JOIN procurement_centers c ON c.id = b.center_id
        LEFT JOIN procurements p ON p.booking_id = b.id
        WHERE b.status IN ('PAYMENT_PROCESSING', 'PAYMENT_PENDING', 'ACCEPTED', 'ARRIVED')
           OR (b.payment_status = 'PENDING' AND b.price IS NOT NULL)
        ORDER BY b.id DESC
        LIMIT 10
      `);

      return res.rows.map(r => ({
        id: `PAY-DB-${r.booking_id}`,
        phoneNumber: r.phone_number,
        farmerName: r.farmer_name,
        tokenId: r.token_number,
        procurementId: `PRC-${r.booking_id}`,
        amount: Math.round(parseFloat(r.total_amount || r.amount || '35000')),
        delayReason: 'బ్యాంక్ సర్వర్ సాంకేతిక నిర్వహణ (Bank server technical clearance)',
        expectedPayoutDate: 'Within 24-48 hours',
        delayedHours: 36,
        status: 'DELAYED',
        notified: false
      }));
    } catch (err) {
      console.error('[DB Delayed Payments Error]', err.message);
      return [];
    }
  }
};

module.exports = db;
