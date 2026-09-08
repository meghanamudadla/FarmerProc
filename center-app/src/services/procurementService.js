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
 * Evaluates Quality Inspection parameters against Government MSP Limits
 */
export function evaluateQualityRules(params = {}) {
  const moisture = parseFloat(params.moisture_percent) || 0;
  const foreignMatter = parseFloat(params.foreign_matter_percent) || 0;
  const damagedGrains = parseFloat(params.damaged_grains_percent) || 0;
  const slightlyDamaged = parseFloat(params.slightly_damaged_percent) || 0;
  const shrivelledBroken = parseFloat(params.shrivelled_broken_percent) || 0;
  const otherGrains = parseFloat(params.other_grains_percent) || 0;
  const weevilledGrains = parseFloat(params.weevilled_grains_percent) || 0;

  // Rejection triggers
  if (moisture > 14.0) {
    return { result: 'REJECTED', reason: `Moisture content ${moisture}% exceeds maximum threshold of 14%`, suggestedDeductionRs: 0 };
  }
  if (foreignMatter > 2.0) {
    return { result: 'REJECTED', reason: `Foreign matter ${foreignMatter}% exceeds maximum threshold of 2%`, suggestedDeductionRs: 0 };
  }
  if (damagedGrains > 4.0) {
    return { result: 'REJECTED', reason: `Damaged grains ${damagedGrains}% exceeds maximum threshold of 4%`, suggestedDeductionRs: 0 };
  }
  if (slightlyDamaged > 4.0) {
    return { result: 'REJECTED', reason: `Slightly damaged grains ${slightlyDamaged}% exceeds maximum threshold of 4%`, suggestedDeductionRs: 0 };
  }
  if (shrivelledBroken > 6.0) {
    return { result: 'REJECTED', reason: `Shrivelled / Broken grains ${shrivelledBroken}% exceeds maximum threshold of 6%`, suggestedDeductionRs: 0 };
  }
  if (otherGrains > 2.0) {
    return { result: 'REJECTED', reason: `Other food grains ${otherGrains}% exceeds maximum threshold of 2%`, suggestedDeductionRs: 0 };
  }
  if (weevilledGrains > 1.0) {
    return { result: 'REJECTED', reason: `Weevilled grains ${weevilledGrains}% exceeds maximum threshold of 1%`, suggestedDeductionRs: 0 };
  }

  // Deduction triggers
  let totalDeductionRs = 0;
  if (moisture > 12.0) {
    const excessPct = moisture - 12.0;
    totalDeductionRs += Math.round(excessPct * 20); // Rs 20 per 1% excess moisture
  }
  if (foreignMatter > 1.0) {
    totalDeductionRs += 15;
  }
  if (damagedGrains > 2.0) {
    totalDeductionRs += 25;
  }

  if (totalDeductionRs > 0) {
    return {
      result: 'DEDUCTION_APPLIED',
      reason: 'Slightly above FAQ limits. Quality deduction applied per MSP guidelines.',
      suggestedDeductionRs: totalDeductionRs,
    };
  }

  return {
    result: 'FAQ_ACCEPTED',
    reason: 'Meets full Government MSP Fair Average Quality (FAQ) standards.',
    suggestedDeductionRs: 0,
  };
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
