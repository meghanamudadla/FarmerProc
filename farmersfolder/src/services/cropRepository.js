/**
 * KisanSeva — Farmer Crop Repository & Lifecycle Service
 * 
 * Implements the single source of truth for farmer crop registrations,
 * structured date tracking, duplicate prevention by season/plot,
 * eligibility status management, non-destructive deactivation,
 * and quantity-based procurement completion tracking.
 */

import { PREDEFINED_CROPS, cropById } from '../data/domain.js';

const STORAGE_KEY = 'kisanseva_farmer_crops';
const AUDIT_STORAGE_KEY = 'kisanseva_crop_audit_logs';

export const CROP_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
};

export const ELIGIBILITY_STATUS = {
  ELIGIBLE: 'ELIGIBLE',
  PENDING: 'PENDING',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
};

// Standard fallback yield norms (Qtl / Acre)
const DEFAULT_PREDEFINED_YIELD = 15;
const DEFAULT_CUSTOM_YIELD = 12;

export class CropRepository {
  /**
   * Format ISO date string (YYYY-MM-DD) into user-friendly format (e.g. "08 Sep 2026")
   * @param {string} isoDateStr 
   * @returns {string}
   */
  static formatCropDate(isoDateStr) {
    if (!isoDateStr) return '—';
    try {
      const parts = isoDateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    } catch {
      // fallback to raw
    }
    return isoDateStr;
  }

  /**
   * Returns default seed crop registrations.
   * Associated with demo farmer (FRM-10245 / FARM-91234567).
   */
  static getDefaultSeeds() {
    const today = '2026-09-08';
    return [
      {
        cropRecordId: 'CROP-101',
        farmerId: 'FRM-10245',
        cropId: 'paddy',
        cropName: 'Paddy (Grade A)',
        normalizedCropName: 'paddy grade a',
        cropSource: 'PREDEFINED',
        registrationDate: today,
        season: 'Kharif 2026',
        plotReference: 'Survey Plot 104/A',
        landArea: 4.0,
        expectedQty: 90,
        entitlementQuantity: 80,
        procuredQuantity: 30, // 30 Qtl procured from prior completed booking
        remainingQuantity: 50,
        eligibilityStatus: ELIGIBILITY_STATUS.ELIGIBLE,
        status: CROP_STATUS.ACTIVE,
        completedDate: null,
        notes: 'Premium Sona Masoori harvest',
        createdAt: today,
        updatedAt: today,
      },
      {
        cropRecordId: 'CROP-102',
        farmerId: 'FRM-10245',
        cropId: 'cotton',
        cropName: 'Cotton',
        normalizedCropName: 'cotton',
        cropSource: 'PREDEFINED',
        registrationDate: today,
        season: 'Kharif 2026',
        plotReference: 'Survey Plot 108/B',
        landArea: 3.5,
        expectedQty: 30,
        entitlementQuantity: 28,
        procuredQuantity: 0,
        remainingQuantity: 28,
        eligibilityStatus: ELIGIBILITY_STATUS.PENDING,
        status: CROP_STATUS.ACTIVE,
        completedDate: null,
        notes: 'Long staple cotton',
        createdAt: today,
        updatedAt: today,
      },
    ];
  }

  /**
   * Loads all crops from persistent storage.
   * @returns {Array}
   */
  static getAllCrops() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize legacy schema records if any
          return parsed.map((c) => this.normalizeCropRecord(c));
        }
      }
    } catch {
      // fallback
    }
    const seeds = this.getDefaultSeeds();
    this.saveAllCrops(seeds);
    return seeds;
  }

  /**
   * Ensures consistent data model structure across all records (Section 43).
   * @param {Object} c 
   * @returns {Object}
   */
  static normalizeCropRecord(c) {
    let entitlement = parseFloat(c.entitlementQuantity != null ? c.entitlementQuantity : c.eligibleQty) || 0;
    const procured = parseFloat(c.procuredQuantity != null ? c.procuredQuantity : c.alreadyProcuredQty) || 0;
    if (procured > entitlement && entitlement > 0) {
      entitlement = procured;
    }
    const remaining = Math.max(0, entitlement - procured);

    let status = c.status || CROP_STATUS.ACTIVE;
    if ((status === CROP_STATUS.ACTIVE || !status) && remaining === 0 && entitlement > 0) {
      status = CROP_STATUS.COMPLETED;
    }

    return {
      cropRecordId: c.cropRecordId || c.id || ('CROP-' + Math.random().toString(36).slice(2, 7).toUpperCase()),
      // Preserved from real backend crops (see realCrops.js normalizeRealCrop)
      // so booking submission can reference the actual Crop row — this
      // normalizer otherwise only knows about the local mock crop shape.
      backendCropId: c.backendCropId ?? null,
      isRealCrop: c.isRealCrop || false,
      farmerId: c.farmerId || 'FRM-10245',
      cropId: c.cropId || 'produce',
      cropName: c.cropName || cropById(c.cropId)?.en || c.cropId,
      normalizedCropName: c.normalizedCropName || this.normalizeCropName(c.cropName || c.cropId),
      cropSource: c.cropSource || 'PREDEFINED',
      registrationDate: c.registrationDate || c.createdDate || '2026-09-08',
      season: c.season || 'Kharif 2026',
      plotReference: c.plotReference || 'Main Holding',
      landArea: parseFloat(c.landArea) || 2.0,
      expectedQty: parseFloat(c.expectedQty) || entitlement,
      entitlementQuantity: entitlement,
      eligibleQty: entitlement, // Alias for legacy compatibility
      procuredQuantity: procured,
      alreadyProcuredQty: procured, // Alias for legacy compatibility
      remainingQuantity: remaining,
      eligibilityStatus: c.eligibilityStatus || (c.verificationStatus === 'verified' ? ELIGIBILITY_STATUS.ELIGIBLE : ELIGIBILITY_STATUS.PENDING),
      status,
      completedDate: c.completedDate || (status === CROP_STATUS.COMPLETED ? (c.updatedAt || '2026-09-08') : null),
      notes: c.notes || '',
      createdAt: c.createdAt || c.createdDate || '2026-09-08',
      updatedAt: c.updatedAt || c.updatedDate || '2026-09-08',
    };
  }

  /**
   * Saves all crop records to storage.
   * @param {Array} crops 
   */
  static saveAllCrops(crops) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
    } catch {
      // storage unavailable
    }
  }

  /**
   * Retrieves registered crops for a specific farmer (Section 3).
   * Farmer A never sees Farmer B's crops.
   * @param {string} farmerId 
   * @returns {Array}
   */
  static getCropsForFarmer(farmerId) {
    if (!farmerId) return [];
    const all = this.getAllCrops();
    // Support both canonical demo IDs FRM-10245 and FARM-91234567 for demo consistency
    const isTarget = (id) =>
      id === farmerId ||
      ((farmerId === 'FRM-10245' || farmerId === 'FARM-91234567') && (id === 'FRM-10245' || id === 'FARM-91234567'));

    return all.filter((c) => isTarget(c.farmerId));
  }

  /**
   * Normalizes crop name: trims leading/trailing spaces, collapses internal whitespace (Section 9).
   * @param {string} name 
   * @returns {string}
   */
  static normalizeCropName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Capitalizes display string safely.
   * @param {string} str 
   * @returns {string}
   */
  static formatDisplayName(str) {
    if (!str || typeof str !== 'string') return '';
    const trimmed = str.trim().replace(/\s+/g, ' ');
    return trimmed;
  }

  /**
   * Validates custom crop input according to rural government portal rules (Section 9).
   * @param {string} rawName 
   * @returns {{ valid: boolean, cleanName?: string, error?: string }}
   */
  static validateCustomCropName(rawName) {
    const clean = this.formatDisplayName(rawName);

    if (!clean || clean.length === 0) {
      return { valid: false, error: 'Crop name cannot be empty. Please enter a valid crop name.' };
    }

    if (clean.length < 2) {
      return { valid: false, error: 'Crop name is too short. Please enter at least 2 characters.' };
    }

    if (clean.length > 50) {
      return { valid: false, error: 'Crop name cannot exceed 50 characters.' };
    }

    const allowedPattern = /^[a-zA-Z0-9\s/()'-]+$/;
    if (!allowedPattern.test(clean)) {
      return { valid: false, error: 'Crop name contains invalid characters. Use letters, numbers, and basic punctuation only.' };
    }

    return { valid: true, cleanName: clean };
  }

  /**
   * Validates crop registration date (Section 10 & 11).
   * @param {string} dateStr 
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateRegistrationDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      return { valid: false, error: 'Crop registration date is required.' };
    }

    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      return { valid: false, error: 'Please enter a valid date in YYYY-MM-DD format.' };
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return { valid: false, error: 'Invalid date values. Please select a valid calendar date.' };
    }

    const enteredDate = new Date(year, month - 1, day);
    const now = new Date();
    // Cannot be more than 1 year in the future (Section 11)
    const maxFuture = new Date();
    maxFuture.setFullYear(now.getFullYear() + 1);

    if (enteredDate > maxFuture) {
      return { valid: false, error: 'Registration date cannot be more than 1 year in the future.' };
    }

    return { valid: true };
  }

  /**
   * Registers a new crop record (Section 5, 6, 8, 9, 10, 12, 49, 50, 51).
   * @param {Object} params
   * @returns {{ success: boolean, crop?: Object, isDuplicate?: boolean, error?: string }}
   */
  static registerCrop({
    farmerId,
    cropType = 'PREDEFINED', // 'PREDEFINED' | 'CUSTOM'
    selectedPredefinedId,
    customCropName,
    registrationDate,
    season = 'Kharif 2026',
    plotReference = 'Main Plot',
    landArea = 2.0,
    expectedQty,
    notes = '',
  }) {
    if (!farmerId) {
      return { success: false, error: 'Authenticated farmer profile required to register crops.' };
    }

    // Validate registration date
    const todayStr = new Date().toISOString().split('T')[0];
    const finalDate = registrationDate || todayStr;
    const dateVal = this.validateRegistrationDate(finalDate);
    if (!dateVal.valid) {
      return { success: false, error: dateVal.error };
    }

    const landNum = parseFloat(landArea) || 0;
    if (landNum <= 0) {
      return { success: false, error: 'Land area must be greater than zero.' };
    }

    let finalCropId = '';
    let finalCropName = '';
    let cropSource = cropType === 'CUSTOM' ? 'CUSTOM' : 'PREDEFINED';
    let yieldNorm = DEFAULT_PREDEFINED_YIELD;
    let initialEligibility = ELIGIBILITY_STATUS.ELIGIBLE;

    if (cropSource === 'CUSTOM') {
      const nameVal = this.validateCustomCropName(customCropName);
      if (!nameVal.valid) {
        return { success: false, error: nameVal.error };
      }
      // Section 14 & 52: Preserve farmer's exact entered name ("Lady Finger" or "Lady Finder")
      finalCropName = nameVal.cleanName;
      finalCropId = 'custom-' + finalCropName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      yieldNorm = DEFAULT_CUSTOM_YIELD;
      // Section 21 & 53: Custom crops do not automatically become ELIGIBLE!
      initialEligibility = ELIGIBILITY_STATUS.VERIFICATION_REQUIRED;
    } else {
      const predefinedObj = PREDEFINED_CROPS.find((c) => c.id === selectedPredefinedId) || PREDEFINED_CROPS[0];
      finalCropId = predefinedObj.id;
      finalCropName = predefinedObj.en;
      yieldNorm = predefinedObj.yieldPerAcre || DEFAULT_PREDEFINED_YIELD;
      initialEligibility = ELIGIBILITY_STATUS.ELIGIBLE;
    }

    const normalizedName = this.normalizeCropName(finalCropName);

    // Contextual Duplicate Check:
    // Only block if an existing crop of the same type and season is actively uncompleted.
    // Allow re-registration when the existing crop is fully completed (remainingQuantity === 0 or status === COMPLETED).
    const farmerCrops = this.getCropsForFarmer(farmerId);
    const existingActiveCrop = farmerCrops.find((c) => {
      const isSameCrop =
        c.normalizedCropName === normalizedName ||
        (c.cropId && finalCropId && c.cropId === finalCropId);
      const isSameSeason = c.season === season;
      const isCompleted = c.status === CROP_STATUS.COMPLETED || c.remainingQuantity === 0;
      const isInactive = c.status === CROP_STATUS.INACTIVE || c.status === CROP_STATUS.ARCHIVED;

      // Duplicate constraint only applies to active, uncompleted records
      return isSameCrop && isSameSeason && !isCompleted && !isInactive;
    });

    if (existingActiveCrop) {
      return {
        success: false,
        isDuplicate: true,
        existingCrop: existingActiveCrop,
        error: `"${finalCropName}" is already actively registered under your profile for ${season} (Remaining Quota: ${existingActiveCrop.remainingQuantity} Qtl). You can register a new quota cycle once current procurement is completed.`,
      };
    }

    // Backend derived government entitlement
    const entitlement = Math.round(landNum * yieldNorm);
    const expNum = parseFloat(expectedQty) || 0;
    // Authoritative individual crop quota: if declared harvest is provided, use it as individual crop quota, else default to standard yield
    const effectiveQuota = expNum > 0 ? expNum : entitlement;

    const newCropRecord = {
      cropRecordId: 'CROP-' + Date.now().toString().slice(-6),
      farmerId,
      cropId: finalCropId,
      cropName: finalCropName,
      normalizedCropName: normalizedName,
      cropSource,
      registrationDate: finalDate,
      season,
      plotReference: plotReference.trim() || 'Main Plot',
      landArea: landNum,
      expectedQty: expNum || effectiveQuota,
      entitlementQuantity: effectiveQuota,
      eligibleQty: effectiveQuota,
      procuredQuantity: 0,
      alreadyProcuredQty: 0,
      remainingQuantity: effectiveQuota,
      eligibilityStatus: initialEligibility,
      status: CROP_STATUS.ACTIVE,
      completedDate: null,
      notes: notes.trim(),
      createdAt: todayStr,
      updatedAt: todayStr,
    };

    const all = this.getAllCrops();
    all.unshift(newCropRecord);
    this.saveAllCrops(all);

    this.logAudit({
      actorId: farmerId,
      farmerId,
      cropId: newCropRecord.cropRecordId,
      action: 'CROP_REGISTERED',
      details: `Registered ${newCropRecord.cropName} (${cropSource}) with quota ${entitlement} Qtl for ${season}`,
    });

    return { success: true, crop: newCropRecord };
  }

  /**
   * Updates an existing registered crop record.
   * Allows editing land area, expected quantity, plot reference, registration date, season, notes,
   * and custom crop name (if CUSTOM crop).
   * Automatically recalculates entitlement and remaining quota safely.
   *
   * @param {Object} params
   * @returns {{ success: boolean, crop?: Object, error?: string }}
   */
  static updateCrop({
    cropRecordId,
    farmerId,
    cropName,
    landArea,
    expectedQty,
    season,
    plotReference,
    registrationDate,
    notes,
  }) {
    const all = this.getAllCrops();
    const index = all.findIndex((c) => c.cropRecordId === cropRecordId);

    if (index === -1) {
      return { success: false, error: 'Crop record not found.' };
    }

    const target = { ...all[index] };

    // Section 41: Farmer ownership verification
    const isOwner =
      target.farmerId === farmerId ||
      ((farmerId === 'FRM-10245' || farmerId === 'FARM-91234567') &&
        (target.farmerId === 'FRM-10245' || target.farmerId === 'FARM-91234567'));

    if (!isOwner) {
      return { success: false, error: 'Unauthorized: You do not have permission to update this crop record.' };
    }

    // Validate registration date if updated
    if (registrationDate) {
      const dateCheck = this.validateRegistrationDate(registrationDate);
      if (!dateCheck.valid) {
        return { success: false, error: dateCheck.error };
      }
      target.registrationDate = registrationDate;
    }

    // If custom crop and cropName is edited
    if (target.cropSource === 'CUSTOM' && cropName && cropName.trim() !== target.cropName) {
      const nameCheck = this.validateCustomCropName(cropName);
      if (!nameCheck.valid) {
        return { success: false, error: nameCheck.error };
      }
      target.cropName = nameCheck.cleanName;
      target.normalizedCropName = this.normalizeCropName(nameCheck.cleanName);
    }

    // Update landArea if provided
    const newLandArea = parseFloat(landArea);
    if (!isNaN(newLandArea) && newLandArea > 0) {
      target.landArea = newLandArea;
    }

    // Update expected harvest if provided
    const newExpected = parseFloat(expectedQty);
    if (!isNaN(newExpected) && newExpected > 0) {
      target.expectedQty = newExpected;
    }

    // Recalculate entitlement based on declared harvest or standard crop yield norm
    const predefinedObj = PREDEFINED_CROPS.find((p) => p.id === target.cropId);
    const yieldNorm = target.cropSource === 'CUSTOM' ? 12 : (predefinedObj?.yieldPerAcre || 15);
    const calculatedNormEntitlement = Math.round((target.landArea || 1) * yieldNorm);
    const currentProcured = parseFloat(target.procuredQuantity) || 0;

    // Use declared expected quantity if provided, else yield norm
    const declaredQuota = !isNaN(newExpected) && newExpected > 0 ? newExpected : calculatedNormEntitlement;
    target.entitlementQuantity = Math.max(declaredQuota, currentProcured);
    target.eligibleQty = target.entitlementQuantity;
    target.remainingQuantity = Math.max(0, target.entitlementQuantity - currentProcured);

    if (target.remainingQuantity === 0 && target.entitlementQuantity > 0) {
      target.status = CROP_STATUS.COMPLETED;
    } else if (target.status === CROP_STATUS.COMPLETED && target.remainingQuantity > 0) {
      target.status = CROP_STATUS.ACTIVE;
    }

    target.updatedAt = new Date().toISOString().split('T')[0];

    // Save back to storage
    all[index] = target;
    this.saveAllCrops(all);

    this.logAudit({
      actorId: farmerId,
      farmerId,
      cropId: target.cropRecordId,
      action: 'CROP_UPDATED',
      details: `Updated ${target.cropName} (Area: ${target.landArea} Acres, Quota: ${target.entitlementQuantity} Qtl, Season: ${target.season})`,
    });

    return { success: true, crop: target };
  }

  /**
   * Deactivates a crop record, setting status to INACTIVE.
   * It will remain inactive until the user reactivates it.
   * @param {string} cropRecordId 
   * @param {string} farmerId 
   * @returns {{ success: boolean, crop?: Object, message: string }}
   */
  static deactivateCrop(cropRecordId, farmerId) {
    const all = this.getAllCrops();
    const target = all.find((c) => c.cropRecordId === cropRecordId || c.id === cropRecordId);

    if (!target) {
      return { success: false, message: 'Crop record not found.' };
    }

    const today = new Date().toISOString().split('T')[0];
    target.status = CROP_STATUS.INACTIVE;
    target.updatedAt = today;
    this.saveAllCrops(all);

    this.logAudit({
      actorId: farmerId,
      farmerId,
      cropId: target.cropRecordId,
      action: 'CROP_DEACTIVATED',
      details: `Deactivated crop ${target.cropName} (status set to INACTIVE)`,
    });

    return {
      success: true,
      crop: target,
      message: `"${target.cropName}" has been deactivated. It will remain inactive until you reactivate it.`,
    };
  }

  /**
   * Reactivates an INACTIVE crop back to ACTIVE or COMPLETED status.
   * @param {string} cropRecordId 
   * @param {string} farmerId 
   * @returns {{ success: boolean, crop?: Object, message: string }}
   */
  static reactivateCrop(cropRecordId, farmerId) {
    const all = this.getAllCrops();
    const target = all.find((c) => c.cropRecordId === cropRecordId || c.id === cropRecordId);

    if (!target) {
      return { success: false, message: 'Crop record not found.' };
    }

    const today = new Date().toISOString().split('T')[0];
    const isCompleted = target.remainingQuantity === 0 && target.entitlementQuantity > 0;
    target.status = isCompleted ? CROP_STATUS.COMPLETED : CROP_STATUS.ACTIVE;
    target.updatedAt = today;
    this.saveAllCrops(all);

    this.logAudit({
      actorId: farmerId,
      farmerId,
      cropId: target.cropRecordId,
      action: 'CROP_REACTIVATED',
      details: `Reactivated crop ${target.cropName} to ${target.status}`,
    });

    return {
      success: true,
      crop: target,
      message: `✓ "${target.cropName}" has been reactivated successfully.`,
    };
  }

  /**
   * Permanently deletes a crop record from storage.
   * @param {string} cropRecordId 
   * @param {string} farmerId 
   * @returns {{ success: boolean, message: string }}
   */
  static deleteCrop(cropRecordId, farmerId) {
    const all = this.getAllCrops();
    const target = all.find((c) => c.cropRecordId === cropRecordId || c.id === cropRecordId);

    if (!target) {
      return { success: false, message: 'Crop record not found.' };
    }

    const remaining = all.filter((c) => c.cropRecordId !== cropRecordId && c.id !== cropRecordId);
    this.saveAllCrops(remaining);

    this.logAudit({
      actorId: farmerId,
      farmerId,
      cropId: target.cropRecordId,
      action: 'CROP_DELETED',
      details: `Permanently deleted crop record ${target.cropName} (${target.cropRecordId})`,
    });

    return {
      success: true,
      cropRecordId: target.cropRecordId,
      message: `✓ "${target.cropName}" was permanently deleted.`,
    };
  }

  // Backward compatibility alias
  static removeOrArchiveCrop(cropRecordId, farmerId, bookings = []) {
    return this.deactivateCrop(cropRecordId, farmerId, bookings);
  }

  /**
   * Updates finalized procurement quantity and completes crop when remaining reaches 0.
   * Sections 14, 15, 16, 22, 23, 24.
   * @param {Object} params
   * @returns {{ success: boolean, crop?: Object, isCompleted?: boolean, error?: string }}
   */
  static recordProcurementCompletion({ farmerId, cropRecordId, cropId, procuredQty, bookingId }) {
    const all = this.getAllCrops();
    const target = all.find(
      (c) =>
        (cropRecordId && c.cropRecordId === cropRecordId) ||
        (cropId && (c.cropId === cropId || c.cropRecordId === cropId))
    );

    if (!target) {
      return { success: false, error: 'Crop record not found for procurement completion.' };
    }

    const addedQty = parseFloat(procuredQty) || 0;
    if (addedQty <= 0) {
      return { success: false, error: 'Finalized procurement quantity must be greater than zero.' };
    }

    const today = new Date().toISOString().split('T')[0];
    target.procuredQuantity = (parseFloat(target.procuredQuantity) || 0) + addedQty;
    target.alreadyProcuredQty = target.procuredQuantity;
    target.remainingQuantity = Math.max(0, (parseFloat(target.entitlementQuantity) || 0) - target.procuredQuantity);
    target.updatedAt = today;

    let isCompleted = false;
    // Section 15 & 28: If remaining reaches zero, mark COMPLETED
    if (target.remainingQuantity === 0 && target.entitlementQuantity > 0) {
      target.status = CROP_STATUS.COMPLETED;
      target.completedDate = today;
      isCompleted = true;
    }

    this.saveAllCrops(all);

    this.logAudit({
      actorId: farmerId || target.farmerId,
      farmerId: target.farmerId,
      cropId: target.cropRecordId,
      action: isCompleted ? 'CROP_PROCUREMENT_COMPLETED' : 'PROCUREMENT_QUANTITY_UPDATED',
      details: `Procured +${addedQty} Qtl via booking ${bookingId || 'N/A'}. Total: ${target.procuredQuantity}/${target.entitlementQuantity} Qtl. Remaining: ${target.remainingQuantity} Qtl.`,
    });

    return { success: true, crop: target, isCompleted };
  }

  /**
   * Retrieves audit log entries (Section 42).
   * @returns {Array}
   */
  static getAuditLogs() {
    try {
      const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Logs an authoritative audit event.
   * @param {Object} entry 
   */
  static logAudit({ actorId, farmerId, cropId, action, details }) {
    try {
      const logs = this.getAuditLogs();
      logs.unshift({
        id: 'aud-' + Date.now() + Math.random().toString(36).slice(2, 5),
        actorId: actorId || 'SYSTEM',
        farmerId: farmerId || 'N/A',
        cropId: cropId || 'N/A',
        action,
        details,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch {
      // ignore
    }
  }
}
