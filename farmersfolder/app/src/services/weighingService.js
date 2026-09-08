/**
 * Phase 7 — Weighing Service & IoT Weighbridge Hardware Abstraction Layer
 * 
 * Provides:
 * 1. Clean abstraction interface for weighbridge scale integration (manual entry for prototype, ready for IoT/API)
 * 2. Strict mathematical validation: gross >= 0, tare >= 0, net >= 0, net <= gross
 * 3. Weighbridge reference generator and operator timestamping
 */

class WeighingService {
  constructor() {
    this.isConnectedHardware = false; // Prototype manual mode vs IoT gateway
  }

  /**
   * Validate gross and tare weights according to strict business math rules
   */
  validateWeights(grossWeightInput, tareWeightInput) {
    const gross = parseFloat(grossWeightInput);
    const tare = parseFloat(tareWeightInput);

    if (isNaN(gross) || gross < 0) {
      return { valid: false, error: 'Gross weight must be a positive number (gross >= 0).' };
    }

    if (isNaN(tare) || tare < 0) {
      return { valid: false, error: 'Tare weight must be a non-negative number (tare >= 0).' };
    }

    if (tare > gross) {
      return { valid: false, error: 'Tare weight cannot exceed Gross weight (tare <= gross).' };
    }

    const net = Math.round((gross - tare) * 100) / 100;
    if (net < 0) {
      return { valid: false, error: 'Net weight must be positive (net >= 0).' };
    }

    return {
      valid: true,
      error: null,
      gross,
      tare,
      net,
    };
  }

  /**
   * Create finalized Weighing Ticket Record
   */
  recordWeighing({ grossWeight, tareWeight, operatorName = 'Officer M. Rao', unit = 'Qtl' }) {
    const validation = this.validateWeights(grossWeight, tareWeight);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return {
      weighingRef: 'WB-2026-' + Math.floor(10000 + Math.random() * 90000),
      grossWeight: validation.gross,
      tareWeight: validation.tare,
      netWeight: validation.net,
      unit,
      operatorName,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hardwareStatus: this.isConnectedHardware ? 'IOT_WEIGHBRIDGE_SYNCED' : 'MANUAL_OFFICER_ENTRY',
    };
  }

  toggleHardwareSync(enabled) {
    this.isConnectedHardware = enabled;
  }
}

export const weighingService = new WeighingService();
