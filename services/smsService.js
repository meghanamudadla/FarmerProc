/**
 * Fast2SMS Service for Group 1 Telephony
 * Sends Telugu Unicode SMS receipts & queue updates to the farmer's mobile phone.
 */

const axios = require('axios');

class SmsService {
  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || '';
    this.route = process.env.FAST2SMS_ROUTE || 'q'; // 'q' is Quick SMS (supports Unicode)
    this.apiUrl = 'https://www.fast2sms.com/dev/bulkV2';

    // Store sent SMS history for inspection & testing dashboard
    this.smsHistory = [];
  }

  /**
   * Cleans phone number to standard 10-digit Indian mobile format
   * e.g. "+919876543210" or "09876543210" -> "9876543210"
   */
  sanitizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    const digitsOnly = String(phoneNumber).replace(/\D/g, '');
    return digitsOnly.slice(-10);
  }

  /**
   * Send Telugu Unicode SMS via Fast2SMS
   * @param {string} phoneNumber - Farmer's mobile number
   * @param {string} message - Telugu text message
   * @returns {Promise<{success: boolean, message: string, data?: any}>}
   */
  async sendTeluguSms(phoneNumber, message) {
    const cleanPhone = this.sanitizePhoneNumber(phoneNumber);

    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      to: cleanPhone,
      message,
      status: 'PENDING',
      details: null
    };

    if (!cleanPhone || cleanPhone.length !== 10) {
      console.warn(`[Fast2SMS] Invalid phone number provided: "${phoneNumber}"`);
      logEntry.status = 'INVALID_PHONE';
      this.smsHistory.unshift(logEntry);
      return { success: false, message: 'Invalid 10-digit Indian phone number' };
    }

    // Dry-run mode if no API key is provided
    if (!this.apiKey || this.apiKey === 'your_fast2sms_api_key_here') {
      console.log('\n=============================================================');
      console.log(`[Fast2SMS DRY-RUN] (No API key provided - simulating SMS send)`);
      console.log(`To: +91 ${cleanPhone}`);
      console.log(`Message:\n${message}`);
      console.log('=============================================================\n');

      logEntry.status = 'SIMULATED';
      logEntry.details = 'Dry-run successful (No FAST2SMS_API_KEY set)';
      this.smsHistory.unshift(logEntry);

      return {
        success: true,
        dryRun: true,
        message: 'SMS simulated successfully in dry-run mode',
        recipient: cleanPhone
      };
    }

    try {
      console.log(`[Fast2SMS] Sending Telugu SMS to ${cleanPhone}...`);

      const payload = {
        route: this.route,
        message: message,
        language: 'unicode',
        flash: 0,
        numbers: cleanPhone
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      console.log(`[Fast2SMS] Response:`, response.data);

      logEntry.status = response.data?.return ? 'SENT' : 'FAILED';
      logEntry.details = response.data;
      this.smsHistory.unshift(logEntry);

      return {
        success: !!response.data?.return,
        data: response.data,
        recipient: cleanPhone
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error(`[Fast2SMS] Failed to send SMS to ${cleanPhone}:`, errMsg);

      logEntry.status = 'ERROR';
      logEntry.details = errMsg;
      this.smsHistory.unshift(logEntry);

      return {
        success: false,
        error: errMsg,
        recipient: cleanPhone
      };
    }
  }

  /**
   * Get recent SMS logs (for web dashboard)
   */
  getHistory() {
    return this.smsHistory.slice(0, 50);
  }
}

module.exports = new SmsService();
