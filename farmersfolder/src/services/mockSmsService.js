/**
 * Phase 9 — Mock SMS Gateway Service Adapter (Simulated Demo Mode)
 * 
 * Simulates telecom DLT SMS gateway transmission, delivery status callbacks,
 * and retry workflows for local development and demonstration purposes.
 */

class MockSmsService {
  constructor() {
    this.failureRate = 0; // Default: 0% failure for smooth demo; configurable
  }

  /**
   * Send SMS via telecom gateway adapter
   */
  async sendSms({ toMobile, messageText, templateId = 'DLT-AGRI-10029' }) {
    const timestamp = new Date().toISOString();
    
    // Simulate gateway dispatch
    if (Math.random() < this.failureRate) {
      return {
        status: 'FAILED',
        sentTime: timestamp,
        deliveredTime: null,
        gatewayRef: 'SMS-FAIL-' + Math.floor(10000 + Math.random() * 90000),
        failureReason: 'Telecom Carrier Network Timeout / SMSC Gateway Busy',
      };
    }

    return {
      status: 'DELIVERED',
      sentTime: timestamp,
      deliveredTime: timestamp,
      gatewayRef: 'SMS-DLT-' + Math.floor(100000 + Math.random() * 900000),
      failureReason: null,
    };
  }

  setFailureRate(rate) {
    this.failureRate = rate;
  }
}

export const mockSmsService = new MockSmsService();
