import { getMspRate } from '../config/mspRates';

/**
 * Calculates Net Weight in KG: Net = Gross - Tare
 */
export function calculateNetWeight(grossKg = 0, tareKg = 0) {
  const gross = Math.max(0, parseFloat(grossKg) || 0);
  const tare = Math.max(0, parseFloat(tareKg) || 0);
  return Math.max(0, gross - tare);
}

/**
 * Converts Weight in KG to Quintals (1 Quintal = 100 KG)
 */
export function convertKgToQuintals(weightKg = 0) {
  const kg = Math.max(0, parseFloat(weightKg) || 0);
  return Number((kg / 100).toFixed(2));
}

/**
 * Validates weighment input figures
 */
export function validateWeighmentInputs(grossKg, tareKg, bagsWeighed) {
  const gross = parseFloat(grossKg);
  const tare = parseFloat(tareKg);
  const bags = parseInt(bagsWeighed, 10);

  if (isNaN(gross) || gross <= 0) {
    return { isValid: false, error: 'Gross weight must be a positive number greater than 0 kg.' };
  }

  if (isNaN(tare) || tare < 0) {
    return { isValid: false, error: 'Tare weight cannot be negative.' };
  }

  if (tare >= gross) {
    return { isValid: false, error: 'Tare weight (container/bag tare) cannot exceed or equal Gross weight.' };
  }

  if (isNaN(bags) || bags <= 0) {
    return { isValid: false, error: 'Number of weighed bags must be at least 1.' };
  }

  return { isValid: true, error: null };
}

/**
 * Calculates MSP payout breakdown:
 * Formula:
 *   Accepted Quintals = Accepted Weight KG / 100
 *   Base MSP Amount = Accepted Quintals × MSP per Quintal
 *   Final Payable Amount = Base MSP Amount - Quality Deduction
 */
export function calculateMspPayout(acceptedWeightKg, crop, variety, qualityDeduction = 0) {
  const acceptedQuintals = convertKgToQuintals(acceptedWeightKg);
  const mspInfo = getMspRate(crop, variety);
  const ratePerQuintal = mspInfo.ratePerQuintal;

  const baseMspAmount = Math.round(acceptedQuintals * ratePerQuintal);
  const deduction = Math.max(0, parseFloat(qualityDeduction) || 0);
  const finalPayableAmount = Math.max(0, baseMspAmount - deduction);

  return {
    acceptedQuintals,
    mspRatePerQuintal: ratePerQuintal,
    season: mspInfo.season,
    baseMspAmount,
    qualityDeduction: deduction,
    finalPayableAmount,
  };
}
