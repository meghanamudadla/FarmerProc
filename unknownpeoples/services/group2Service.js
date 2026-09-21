/**
 * Group 2 Backend & Database Integration Client
 * Directly queries PostgreSQL Database & FastAPI Backend with Mock fallback.
 */

const axios = require('axios');
const group2Mock = require('../mock/group2Mock');
const db = require('./db');

class Group2Service {
  constructor() {
    this.useMock = process.env.USE_MOCK_GROUP2 === 'true';
    this.baseUrl = process.env.GROUP2_BASE_URL || 'https://farmerprocbackend.onrender.com';
    this.timeout = 5000;
  }

  /**
   * Request Group 2 to generate a slot booking & Token ID
   * Stores directly in PostgreSQL database
   * @param {string} phoneNumber - Farmer's phone number
   * @param {object} [extraData={}] - Optional metadata
   * @returns {Promise<{tokenId: string, slotTime: string, mandiName: string}>}
   */
  async bookSlot(phoneNumber, extraData = {}) {
    if (!this.useMock) {
      try {
        console.log(`[Group 2 DB] Booking slot in PostgreSQL database for ${phoneNumber}...`);
        const dbResult = await db.bookSlot(phoneNumber, extraData);
        if (dbResult && dbResult.success) {
          // Also sync with mock for UI visibility
          group2Mock.bookings.set(dbResult.phoneNumber, {
            tokenId: dbResult.tokenId,
            tokenNumber: dbResult.tokenNumber,
            phoneNumber: dbResult.phoneNumber,
            farmerName: dbResult.farmerName,
            slotTime: dbResult.slotTime,
            mandiName: dbResult.mandiName,
            bookedAt: new Date().toISOString(),
            status: 'WAITING'
          });
          return dbResult;
        }
      } catch (err) {
        console.error(`[Group 2 DB] Error writing booking to database: ${err.message}. Trying API/Mock.`);
      }
    }

    // Try API if configured
    try {
      if (this.baseUrl && !this.useMock) {
        const response = await axios.post(
          `${this.baseUrl}/bookings/`,
          {
            phone: phoneNumber,
            ...extraData
          },
          { timeout: this.timeout }
        );
        return response.data;
      }
    } catch {
      // ignore
    }

    return await group2Mock.bookSlot(phoneNumber, extraData);
  }

  /**
   * Query live Queue Status & Estimated Wait Time (EWT) from PostgreSQL Database
   * @param {string} phoneNumber - Farmer's phone number
   * @returns {Promise<{hasToken: boolean, tokenId: string, tokensAhead: number, estimatedWaitTimeMinutes: number}>}
   */
  async getQueueStatus(phoneNumber) {
    if (!this.useMock) {
      try {
        const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
        console.log(`[Group 2 DB] Querying active booking from PostgreSQL for ${cleanPhone}...`);
        const activeBooking = await db.getFarmerActiveBooking(cleanPhone);

        if (activeBooking) {
          const tokensAhead = await db.getTokensAhead(activeBooking.center_id, activeBooking.id);
          const ewtMinutes = tokensAhead === 0 ? 5 : tokensAhead * 7;
          const slotTime = activeBooking.start_time ? `${activeBooking.start_time.slice(0, 5)} AM` : '10:30 AM';
          const mandiName = activeBooking.center_name || 'రైతు బంధు మార్కెట్ యార్డ్';

          console.log(`[Group 2 DB] Found active booking in PostgreSQL: Token ${activeBooking.token_number}, Status: ${activeBooking.status}, Mandi: ${mandiName}, Ahead: ${tokensAhead}`);

          return {
            success: true,
            hasToken: true,
            tokenId: activeBooking.token_number,
            tokenNumber: activeBooking.token_number,
            status: activeBooking.status,
            slotTime,
            tokensAhead,
            estimatedWaitTimeMinutes: ewtMinutes,
            mandiName
          };
        }
      } catch (err) {
        console.error(`[Group 2 DB] Error querying queue from database: ${err.message}. Falling back to mock.`);
      }
    }

    return await group2Mock.getQueueStatus(phoneNumber);
  }

  /**
   * Cancel a slot booking to free it for smart re-allocation
   * @param {string} identifier - Phone number or Token ID
   * @param {string} [reason] - Reason for cancellation
   */
  async cancelSlot(identifier, reason) {
    if (!this.useMock) {
      try {
        await db.cancelSlot(identifier, reason);
        console.log(`[Group 2 DB] Cancelled slot ${identifier} in PostgreSQL.`);
      } catch (err) {
        console.warn(`[Group 2 DB] Could not update DB for cancellation:`, err.message);
      }
    }
    return await group2Mock.cancelSlot(identifier, reason);
  }

  /**
   * Process re-allocation decision (1=Accept, 2=Decline)
   * On Accept, inserts farmer and booking token directly into PostgreSQL
   * @param {string} reallocationId 
   * @param {'1' | '2' | 'ACCEPT' | 'DECLINE'} decision 
   */
  async handleReallocationResponse(reallocationId, decision) {
    const isAccept = decision === '1' || decision === 'ACCEPT';
    if (isAccept && !this.useMock) {
      const record = group2Mock.reallocations.get(reallocationId);
      if (record && record.offeredFarmer) {
        try {
          const dbBooking = await db.assignReallocatedSlot({
            phoneNumber: record.offeredFarmer.phoneNumber,
            farmerName: record.offeredFarmer.farmerName,
            language: record.offeredFarmer.language,
            freedTokenId: record.slotDetails?.freedTokenId,
            slotDetails: record.slotDetails
          });

          if (dbBooking && dbBooking.success) {
            const result = await group2Mock.handleReallocationResponse(reallocationId, decision);
            result.tokenId = dbBooking.tokenId;
            result.tokenNumber = dbBooking.tokenNumber;
            result.slotTime = dbBooking.slotTime;
            result.mandiName = dbBooking.mandiName;
            if (result.booking) {
              result.booking.tokenId = dbBooking.tokenId;
              result.booking.tokenNumber = dbBooking.tokenNumber;
              result.booking.slotTime = dbBooking.slotTime;
              result.booking.mandiName = dbBooking.mandiName;
            }
            return result;
          }
        } catch (err) {
          console.error('[Group 2 DB] Error assigning reallocated slot in DB:', err.message);
        }
      }
    }
    return await group2Mock.handleReallocationResponse(reallocationId, decision);
  }

  /**
   * Get waitlist of farmers waiting for slots
   */
  getWaitlist() {
    return group2Mock.getWaitlist();
  }

  /**
   * Get active and historical re-allocations
   */
  getReallocations() {
    return group2Mock.getReallocations();
  }

  /**
   * Get delayed payments audit list from PostgreSQL database
   */
  async getDelayedPayments() {
    if (!this.useMock) {
      try {
        const dbDelayed = await db.getDelayedPayments();
        if (Array.isArray(dbDelayed) && dbDelayed.length > 0) {
          return dbDelayed;
        }
      } catch (err) {
        console.warn(`[Group 2 DB] Error fetching delayed payments from DB:`, err.message);
      }
    }
    return group2Mock.getDelayedPayments();
  }

  /**
   * Mark a delayed payment as alerted
   */
  markPaymentNotified(paymentId) {
    return group2Mock.markPaymentNotified(paymentId);
  }

  /**
   * Get all mock bookings (helpful for dashboard/debugging)
   */
  getMockBookings() {
    return group2Mock.getAllBookings();
  }

  /**
   * Reset waitlist and mock demo bookings
   */
  resetWaitlistAndBookings() {
    return group2Mock.resetWaitlistAndBookings();
  }
}

module.exports = new Group2Service();
