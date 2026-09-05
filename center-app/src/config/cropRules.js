/*
  DEMO / CONFIGURATION VALUES:
  Quality parameters and limits below are configurable baseline rules for prototype demonstration.
  In production, these values will be fetched dynamically from the government procurement API / backend database.
*/

export const CROP_QUALITY_RULES = {
  wheat: {
    name: 'Wheat',
    standardName: 'Fair Average Quality (FAQ) Wheat Standard',
    grades: ['FAQ Accepted', 'Accepted with Deduction', 'Rejected'],
    parameters: {
      moisture_percent: { label: 'Moisture (%)', limit: 12.0, unit: '%' },
      foreign_matter_percent: { label: 'Foreign Matter (%)', limit: 0.75, unit: '%' },
      damaged_grains_percent: { label: 'Damaged Grains (%)', limit: 2.0, unit: '%' },
      slightly_damaged_percent: { label: 'Slightly Damaged Grains (%)', limit: 4.0, unit: '%' },
      shrivelled_broken_percent: { label: 'Shrivelled / Broken (%)', limit: 6.0, unit: '%' },
      other_grains_percent: { label: 'Other Food Grains (%)', limit: 2.0, unit: '%' },
      weevilled_grains_percent: { label: 'Weevilled Grains (%)', limit: 1.0, unit: '%' },
    },
  },
  paddy: {
    name: 'Paddy',
    standardName: 'Paddy MSP Quality Standard',
    varieties: ['Common', 'Grade A'],
    parameters: {
      moisture_percent: { label: 'Moisture (%)', limit: 14.0, unit: '%' },
      foreign_matter_percent: { label: 'Foreign Matter (%)', limit: 2.0, unit: '%' },
      damaged_grains_percent: { label: 'Damaged Grains (%)', limit: 5.0, unit: '%' },
      slightly_damaged_percent: { label: 'Slightly Damaged Grains (%)', limit: 5.0, unit: '%' },
      shrivelled_broken_percent: { label: 'Shrivelled / Broken (%)', limit: 5.0, unit: '%' },
      other_grains_percent: { label: 'Other Food Grains (%)', limit: 3.0, unit: '%' },
      weevilled_grains_percent: { label: 'Weevilled Grains (%)', limit: 1.0, unit: '%' },
    },
  },
};

/**
 * Frontend Quality Rule Evaluation Engine
 * Evaluates measured quality parameters against crop-specific procurement limits.
 * 
 * @param {string} cropKey - 'wheat' or 'paddy'
 * @param {Object} params - Measured parameters { moisture_percent, foreign_matter_percent, ... }
 * @returns {Object} { recommendation: 'FAQ_ACCEPTED' | 'ACCEPTED_WITH_DEDUCTION' | 'REJECTED', parameterResults, summaryReason }
 */
export function evaluateCropQuality(cropKey = 'wheat', params = {}) {
  const cropLower = String(cropKey).toLowerCase();
  const ruleConfig = CROP_QUALITY_RULES[cropLower] || CROP_QUALITY_RULES.wheat;

  const parameterResults = [];
  let failedCount = 0;
  let minorExceedCount = 0;
  const failureDetails = [];

  Object.keys(ruleConfig.parameters).forEach((paramKey) => {
    const config = ruleConfig.parameters[paramKey];
    const measuredVal = parseFloat(params[paramKey]);
    const numericVal = isNaN(measuredVal) ? 0 : measuredVal;
    const isPass = numericVal <= config.limit;

    if (!isPass) {
      const diff = numericVal - config.limit;
      if (diff > 3.0) {
        failedCount += 2; // Major violation
      } else {
        minorExceedCount += 1; // Minor violation
      }
      failureDetails.push(`${config.label} measured ${numericVal}% (Limit: ≤ ${config.limit}%)`);
    }

    parameterResults.push({
      key: paramKey,
      label: config.label,
      value: numericVal,
      limit: config.limit,
      unit: config.unit,
      status: isPass ? 'PASS' : 'EXCEEDED',
    });
  });

  let recommendation = 'FAQ_ACCEPTED';
  let summaryReason = 'All measured quality parameters are within the applicable procurement limits.';

  if (failedCount > 0 || minorExceedCount >= 2) {
    recommendation = 'REJECTED';
    summaryReason = `Quality specifications fail procurement standards: ${failureDetails.join('; ')}.`;
  } else if (minorExceedCount === 1) {
    recommendation = 'ACCEPTED_WITH_DEDUCTION';
    summaryReason = `Quality acceptable with price deduction: ${failureDetails.join('; ')}.`;
  }

  return {
    recommendation,
    parameterResults,
    summaryReason,
  };
}
