/**
 * Phase 8 — Mock Payment Service & DBT Banking Lifecycle Simulator
 * 
 * Provides:
 * 1. Isolated DBT/PFMS payment lifecycle simulation
 *    PURCHASE_RECORDED -> PAYMENT_INITIATED -> BANK_PROCESSING -> CREDITED
 * 2. Simulated payment failure state with safe error reasons and reference tracking
 * 3. Masked banking security (never leaks full credentials)
 */

export const PAYMENT_STAGES = [
  'PURCHASE_RECORDED',
  'PAYMENT_INITIATED',
  'BANK_PROCESSING',
  'CREDITED',
];

class MockPaymentService {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  broadcast(event, payload) {
    this.listeners.forEach((cb) => cb(event, payload));
  }

  /**
   * Get the next stage in the DBT payment sequence
   */
  getNextStage(currentStage) {
    const stageMap = {
      purchase_recorded: 'payment_initiated',
      payment_initiated: 'bank_processing',
      bank_processing: 'credited',
      initiated: 'bank_processing',
      verified: 'bank_processing',
      processing: 'credited',
      credited: 'credited',
      payment_failed: 'payment_initiated', // retry option
    };

    const norm = (currentStage || 'purchase_recorded').toLowerCase();
    return stageMap[norm] || 'credited';
  }

  /**
   * Generate payment transaction metadata
   */
  generateTransactionMeta(token, amount, method = 'Direct DBT Transfer (PFMS)') {
    return {
      dbtReferenceId: 'DBT-PFMS-2026-' + Math.floor(100000 + Math.random() * 900000),
      utrNumber: 'UTR-SBIN' + Math.floor(10000000 + Math.random() * 90000000),
      disbursalMethod: method,
      amount,
      maskedAccount: '•••• •••• 3422',
      initiatedTimestamp: new Date().toISOString(),
      creditedTimestamp: null,
      status: 'initiated',
    };
  }

  /**
   * Simulate a banking failure safely (for testing failure handling)
   */
  simulatePaymentFailure(bookingId, safeReason = 'Bank branch IFSC migration in progress. Re-verification required.') {
    const failurePayload = {
      bookingId,
      status: 'payment_failed',
      failureReason: safeReason,
      failureRefId: 'ERR-PFMS-' + Math.floor(10000 + Math.random() * 90000),
      supportContact: '1800-180-1551 (Kisan Call Centre) / Mandi Helpdesk Counter #4',
      timestamp: new Date().toISOString(),
    };

    this.broadcast('PAYMENT_FAILED', failurePayload);
    return failurePayload;
  }
}

export const mockPaymentService = new MockPaymentService();
