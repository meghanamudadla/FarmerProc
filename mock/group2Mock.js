/**
 * In-Memory Mock Service for Group 2 Backend
 * Simulates Token Generation, Queue Status, and Estimated Wait Time (EWT)
 * Allows Group 1 Telephony to run and be verified independently.
 */

class Group2Mock {
  constructor() {
    this.tokenCounter = 104;
    this.currentlyServingNumber = 99;
    this.averageMinutesPerToken = 7;
    
    // Store bookings by phone number: phoneNumber -> BookingDetails
    this.bookings = new Map();

    // Pre-populate with a sample farmer for instant status check testing
    this.bookings.set('9876543210', {
      tokenId: 'MND-104',
      tokenNumber: 104,
      phoneNumber: '9876543210',
      slotTime: '11:00 AM',
      mandiName: 'వరంగల్ మార్కెట్ యార్డ్ (Warangal Mandi)',
      bookedAt: new Date().toISOString(),
      status: 'WAITING'
    });
  }

  /**
   * Simulates Group 2 Slot Booking
   * @param {string} phoneNumber 
   * @param {object} extraData 
   * @returns {Promise<object>}
   */
  async bookSlot(phoneNumber, extraData = {}) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    this.tokenCounter += 1;
    const tokenNumber = this.tokenCounter;
    const tokenId = `MND-${tokenNumber}`;

    // Calculate a dynamic slot time e.g. 30 mins from now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const slotTime = `${formattedHours}:${minutes} ${ampm}`;

    const booking = {
      tokenId,
      tokenNumber,
      phoneNumber: cleanPhone,
      slotTime,
      mandiName: extraData.mandiName || 'రైతు బంధు మార్కెట్ యార్డ్',
      bookedAt: new Date().toISOString(),
      status: 'WAITING'
    };

    this.bookings.set(cleanPhone, booking);

    console.log(`[Group 2 Mock] New Token Generated: ${tokenId} for phone: ${cleanPhone}`);

    return {
      success: true,
      tokenId: booking.tokenId,
      tokenNumber: booking.tokenNumber,
      slotTime: booking.slotTime,
      mandiName: booking.mandiName,
      phoneNumber: booking.phoneNumber
    };
  }

  /**
   * Simulates Group 2 Queue Status Calculation
   * @param {string} phoneNumber 
   * @returns {Promise<object>}
   */
  async getQueueStatus(phoneNumber) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    const booking = this.bookings.get(cleanPhone);

    if (!booking) {
      console.log(`[Group 2 Mock] No active token found for phone: ${cleanPhone}`);
      return {
        success: false,
        hasToken: false,
        message: 'No active booking found for this phone number'
      };
    }

    // Compute tokens ahead
    const tokensAhead = Math.max(0, booking.tokenNumber - this.currentlyServingNumber - 1);
    const estimatedWaitTimeMinutes = tokensAhead === 0 ? 5 : tokensAhead * this.averageMinutesPerToken;
    const currentServingToken = `MND-${this.currentlyServingNumber}`;

    console.log(`[Group 2 Mock] Queue Status for ${cleanPhone}: Token ${booking.tokenId}, Ahead: ${tokensAhead}, EWT: ${estimatedWaitTimeMinutes}m`);

    return {
      success: true,
      hasToken: true,
      tokenId: booking.tokenId,
      tokenNumber: booking.tokenNumber,
      currentServingToken,
      tokensAhead,
      estimatedWaitTimeMinutes,
      mandiName: booking.mandiName
    };
  }

  /**
   * Returns all active bookings (for debug UI)
   */
  getAllBookings() {
    return Array.from(this.bookings.values());
  }

  /**
   * Reset mock queue state
   */
  reset() {
    this.bookings.clear();
    this.tokenCounter = 100;
    this.currentlyServingNumber = 95;
  }
}

// Export singleton instance
module.exports = new Group2Mock();
