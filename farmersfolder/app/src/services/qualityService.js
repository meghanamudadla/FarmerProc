/**
 * Phase 7 — Quality Check Policy Engine
 * 
 * Provides:
 * 1. Configurable crop quality threshold policy (Moisture %, Foreign Matter %)
 * 2. Inspection record generator & grade evaluator (GRADE_A, GRADE_B, REJECTED)
 * 3. Rejection reason formatter & inspector signature stamp
 */

export const QUALITY_POLICIES = {
  cotton: {
    cropId: 'cotton',
    name: 'Cotton',
    maxMoisture: 12.0, // %
    maxForeignMatter: 2.0, // %
    gradeATolMoisture: 8.0,
    mspPerQtl: 6620,
  },
  paddy: {
    cropId: 'paddy',
    name: 'Paddy (Rice)',
    maxMoisture: 17.0, // %
    maxForeignMatter: 1.5, // %
    gradeATolMoisture: 14.0,
    mspPerQtl: 2183,
  },
  chilli: {
    cropId: 'chilli',
    name: 'Dry Chilli',
    maxMoisture: 10.0, // %
    maxForeignMatter: 1.0, // %
    gradeATolMoisture: 7.0,
    mspPerQtl: 7000,
  },
  maize: {
    cropId: 'maize',
    name: 'Maize (Corn)',
    maxMoisture: 14.0, // %
    maxForeignMatter: 2.0, // %
    gradeATolMoisture: 11.0,
    mspPerQtl: 2090,
  },
  default: {
    cropId: 'custom',
    name: 'General Produce',
    maxMoisture: 15.0,
    maxForeignMatter: 2.0,
    gradeATolMoisture: 10.0,
    mspPerQtl: 4000,
  },
};

class QualityService {
  constructor() {
    this.customPolicies = { ...QUALITY_POLICIES };
  }

  getPolicyForCrop(cropId) {
    return this.customPolicies[cropId] || this.customPolicies.default;
  }

  updatePolicy(cropId, patch) {
    const existing = this.getPolicyForCrop(cropId);
    this.customPolicies[cropId] = { ...existing, ...patch };
  }

  /**
   * Evaluate Quality Inspection parameters against configured policy
   */
  evaluateQuality({ cropId, moisturePercentage, foreignMatterPercentage, inspectorName = 'Officer K. Sharma' }) {
    const policy = this.getPolicyForCrop(cropId);
    const moisture = parseFloat(moisturePercentage) || 0;
    const foreignMatter = parseFloat(foreignMatterPercentage) || 0;

    let acceptanceStatus = 'ACCEPTED';
    let qualityGrade = 'GRADE_A';
    let rejectionReason = null;

    if (moisture > policy.maxMoisture) {
      acceptanceStatus = 'REJECTED';
      qualityGrade = 'REJECTED';
      rejectionReason = `Moisture content (${moisture}%) exceeds maximum allowed limit (${policy.maxMoisture}%).`;
    } else if (foreignMatter > policy.maxForeignMatter) {
      acceptanceStatus = 'REJECTED';
      qualityGrade = 'REJECTED';
      rejectionReason = `Foreign matter (${foreignMatter}%) exceeds maximum allowed limit (${policy.maxForeignMatter}%).`;
    } else if (moisture > policy.gradeATolMoisture) {
      qualityGrade = 'GRADE_B';
    }

    return {
      qualityCheckId: 'QC-' + Date.now().toString().slice(-6),
      moisturePercentage: moisture,
      foreignMatterPercentage: foreignMatter,
      qualityGrade,
      acceptanceStatus,
      rejectionReason,
      inspectorName,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
}

export const qualityService = new QualityService();
