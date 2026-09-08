/**
 * EligibilityService Interface & Mock Implementation
 *
 * This service calculates crop procurement eligibility based on state,
 * crop type, season, and verified land acreage.
 *
 * In production, this class will be replaced with an authorized government
 * AgriStack / State Land Registry integration.
 */

export const SEASONS = [
  { id: 'kharif', en: 'Kharif (Monsoon)', te: 'ఖరీఫ్ (వర్షాకాలం)', hi: 'खरीफ (मानसून)' },
  { id: 'rabi', en: 'Rabi (Winter)', te: 'రబీ (చలికాలం)', hi: 'रबी (सर्दियों)' },
  { id: 'zaid', en: 'Zaid (Summer)', te: 'జైద్ (వేసవి)', hi: 'जायद (गर्मी)' },
];

/**
 * Standard yields per acre (in Quintals) per crop
 */
const CROP_YIELD_POLICY = {
  paddy: 20,
  cotton: 8,
  maize: 24,
  wheat: 18,
  jowar: 10,
  bajra: 12,
  groundnut: 9,
  soybean: 11,
  gram: 10,
  redgram: 7,
  mustard: 9,
  sugarcane: 350,
};

export class MockEligibilityService {
  /**
   * Calculates eligible quantity in Quintals.
   * @param {Object} params
   * @param {string} params.cropId
   * @param {number} params.landAcres
   * @param {string} [params.state]
   * @param {string} [params.season]
   * @returns {number}
   */
  static calculateEligibility({ cropId, landAcres }) {
    const acres = parseFloat(landAcres) || 0;
    if (acres <= 0) return 0;
    const yieldPerAcre = CROP_YIELD_POLICY[cropId] || 15;
    return Math.round(acres * yieldPerAcre);
  }

  /**
   * Calculates remaining eligible quantity.
   * Prevents negative remaining values.
   * @param {number} eligibleQty
   * @param {number} alreadyProcuredQty
   * @returns {number}
   */
  static calculateRemaining(eligibleQty, alreadyProcuredQty) {
    const eligible = parseFloat(eligibleQty) || 0;
    const procured = parseFloat(alreadyProcuredQty) || 0;
    return Math.max(0, eligible - procured);
  }

  /**
   * Validates whether a proposed procurement booking quantity is permissible.
   * @param {number} requestedQty
   * @param {number} remainingQty
   * @returns {{ valid: boolean, messageKey?: string }}
   */
  static validateProcurementQuantity(requestedQty, remainingQty) {
    const req = parseFloat(requestedQty);
    const rem = parseFloat(remainingQty);

    if (isNaN(req) || req <= 0) {
      return { valid: false, error: 'invalid_qty' };
    }
    if (req > rem) {
      return { valid: false, error: 'exceeds_remaining' };
    }
    return { valid: true };
  }
}
