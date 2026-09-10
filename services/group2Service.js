/**
 * Group 2 Backend Integration Client
 * Dispatches requests to the real Group 2 Backend or falls back to Group 2 Mock.
 */

const axios = require('axios');
const group2Mock = require('../mock/group2Mock');

class Group2Service {
  constructor() {
    this.useMock = process.env.USE_MOCK_GROUP2 !== 'false';
    this.baseUrl = process.env.GROUP2_BASE_URL || 'http://localhost:5000';
    this.timeout = 5000;
  }

  /**
   * Request Group 2 to generate a slot booking & Token ID
   * @param {string} phoneNumber - Farmer's phone number
   * @param {object} [extraData={}] - Optional metadata
   * @returns {Promise<{tokenId: string, slotTime: string, mandiName: string}>}
   */
  async bookSlot(phoneNumber, extraData = {}) {
    if (this.useMock) {
      return await group2Mock.bookSlot(phoneNumber, extraData);
    }

    try {
      console.log(`[Group 2 Client] Calling POST ${this.baseUrl}/api/slots/book for ${phoneNumber}`);
      const response = await axios.post(
        `${this.baseUrl}/api/slots/book`,
        {
          phoneNumber,
          source: 'IVR_TELEPHONY',
          timestamp: new Date().toISOString(),
          ...extraData
        },
        { timeout: this.timeout }
      );

      return response.data;
    } catch (err) {
      console.error(`[Group 2 Client] Error connecting to Group 2 backend: ${err.message}. Falling back to mock.`);
      return await group2Mock.bookSlot(phoneNumber, extraData);
    }
  }

  /**
   * Query Group 2 for live Queue Status & Estimated Wait Time (EWT)
   * @param {string} phoneNumber - Farmer's phone number
   * @returns {Promise<{hasToken: boolean, tokenId: string, tokensAhead: number, estimatedWaitTimeMinutes: number}>}
   */
  async getQueueStatus(phoneNumber) {
    if (this.useMock) {
      return await group2Mock.getQueueStatus(phoneNumber);
    }

    try {
      console.log(`[Group 2 Client] Calling GET ${this.baseUrl}/api/queue/status?phoneNumber=${phoneNumber}`);
      const response = await axios.get(
        `${this.baseUrl}/api/queue/status`,
        {
          params: { phoneNumber },
          timeout: this.timeout
        }
      );

      return response.data;
    } catch (err) {
      console.error(`[Group 2 Client] Error querying Group 2 queue: ${err.message}. Falling back to mock.`);
      return await group2Mock.getQueueStatus(phoneNumber);
    }
  }

  /**
   * Cancel a slot booking to free it for smart re-allocation
   * @param {string} identifier - Phone number or Token ID
   * @param {string} [reason] - Reason for cancellation
   */
  async cancelSlot(identifier, reason) {
    return await group2Mock.cancelSlot(identifier, reason);
  }

  /**
   * Process re-allocation decision (1=Accept, 2=Decline)
   * @param {string} reallocationId 
   * @param {'1' | '2' | 'ACCEPT' | 'DECLINE'} decision 
   */
  async handleReallocationResponse(reallocationId, decision) {
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
   * Get delayed payments audit list
   */
  getDelayedPayments() {
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
