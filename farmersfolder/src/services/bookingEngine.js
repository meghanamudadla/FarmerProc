/**
 * Smart Slot Booking Engine (Phase 4)
 *
 * Implements the 14-step backend validation pipeline, simulated atomic slot locking
 * (race condition prevention), double-booking protection, quantity quota verification,
 * slot status calculations, and controlled state machine transitions.
 */

import { MockEligibilityService } from './eligibilityService.js';
import { CentreService } from './centreService.js';

export const BOOKING_STATES = {
  BOOKED: 'BOOKED',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  EXPIRED: 'EXPIRED',
};

// Simulated Atomic Mutex Lock for race condition prevention
export class BookingLockEngine {
  static locks = new Set();

  /**
   * Attempts to acquire an atomic lock on a specific slot key.
   * @param {string} slotKey
   * @returns {boolean}
   */
  static acquireLock(slotKey) {
    if (this.locks.has(slotKey)) {
      return false; // Lock already held by a concurrent thread/request
    }
    this.locks.add(slotKey);
    // Auto release after 2 seconds
    setTimeout(() => this.locks.delete(slotKey), 2000);
    return true;
  }

  static releaseLock(slotKey) {
    this.locks.delete(slotKey);
  }
}

export class BookingEngine {
  /**
   * Checks if a farmer already has an active procurement booking.
   * Active states: BOOKED, CONFIRMED, CHECKED_IN
   * @param {Array} bookings
   * @param {string} farmerId
   * @returns {Object|null}
   */
  static getActiveBooking(bookings = []) {
    return (
      bookings.find(
        (b) =>
          b.status === 'booked' ||
          b.status === 'booked' ||
          b.status === BOOKING_STATES.BOOKED ||
          b.status === BOOKING_STATES.CONFIRMED ||
          (b.status === BOOKING_STATES.CHECKED_IN && b.paymentStatus !== 'credited')
      ) || null
    );
  }

  /**
   * Calculates slot status.
   * Statuses: 'AVAILABLE' | 'FULL' | 'CLOSED' | 'EXPIRED'
   * @param {Object} params
   * @param {string} params.date
   * @param {string} params.timeSlotStr
   * @param {number} params.bookedCount
   * @param {number} params.capacityLimit
   * @param {string} params.centreStatus
   * @returns {'AVAILABLE' | 'FULL' | 'CLOSED' | 'EXPIRED'}
   */
  static getSlotStatus({ date, timeSlotStr, bookedCount, capacityLimit = 20, centreStatus }) {
    if (centreStatus !== 'OPEN') return 'CLOSED';

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) return 'EXPIRED';

    if (bookedCount >= capacityLimit) return 'FULL';

    return 'AVAILABLE';
  }

  /**
   * 14-Step Backend Validation & Process Pipeline.
   * @param {Object} params
   * @returns {{ success: boolean, booking?: Object, errorCode?: string, errorMessage?: string, alternativeSlots?: Array }}
   */
  static validateAndProcessBooking({
    farmer,
    crops,
    matchedCrop,
    requestedQty,
    centre,
    date,
    slotIdx,
    slotTimes,
    bankDetails,
    existingBookings,
    slotFillCount = 0,
    allowOverrideActiveBooking = false,
  }) {
    // 1. Authenticate farmer (Part 20 & 35)
    if (!farmer || !farmer.farmerId) {
      return { success: false, errorCode: 'UNAUTHENTICATED', errorMessage: 'Authenticated farmer profile required.' };
    }

    // 2. Double booking check
    if (!allowOverrideActiveBooking) {
      const activeBooking = this.getActiveBooking(existingBookings);
      if (activeBooking && activeBooking.status !== 'cancelled') {
        return {
          success: false,
          errorCode: 'DOUBLE_BOOKING',
          errorMessage: 'You already have an active procurement booking. Complete or cancel your existing booking first.',
        };
      }
    }

    // 3. Verify crop ownership & active status (Part 20, 21, 35)
    const farmerId = farmer.farmerId;
    // Strictly prioritize matching by unique cropRecordId so individual crop quotas are never confused
    const cropRec =
      (matchedCrop?.cropRecordId &&
        crops.find((c) => (farmerId ? c.farmerId === farmerId : true) && c.cropRecordId === matchedCrop.cropRecordId)) ||
      (matchedCrop?.cropRecordId && crops.find((c) => c.cropRecordId === matchedCrop.cropRecordId)) ||
      crops.find(
        (c) =>
          (farmerId ? c.farmerId === farmerId : true) &&
          (c.cropRecordId === matchedCrop?.cropRecordId ||
            c.cropId === matchedCrop?.id ||
            c.cropName === matchedCrop?.en)
      );

    if (!cropRec) {
      return {
        success: false,
        errorCode: 'UNVERIFIED_CROP',
        errorMessage: 'The selected crop is not registered under your farmer profile. Only registered crops can be booked.',
      };
    }

    if (cropRec.status === 'INACTIVE' || cropRec.status === 'ARCHIVED') {
      return {
        success: false,
        errorCode: 'INACTIVE_CROP',
        errorMessage: `The crop "${cropRec.cropName}" is inactive/archived and no longer available for new bookings.`,
      };
    }

    if (cropRec.status === 'COMPLETED' || (cropRec.remainingQuantity != null && cropRec.remainingQuantity <= 0)) {
      return {
        success: false,
        errorCode: 'COMPLETED_CROP',
        errorMessage: `Procurement for "${cropRec.cropName}" has already been fully completed. No remaining quota exists for booking.`,
      };
    }

    // 4. Verify eligibility & 5. Verify remaining quantity strictly per individual crop
    const remainingQty = cropRec.remainingQuantity != null
      ? cropRec.remainingQuantity
      : MockEligibilityService.calculateRemaining(cropRec.eligibleQty, cropRec.alreadyProcuredQty);
    const reqQtyNum = parseFloat(requestedQty) || 0;

    if (reqQtyNum <= 0) {
      return {
        success: false,
        errorCode: 'INVALID_QUANTITY',
        errorMessage: 'Procurement quantity must be greater than zero.',
      };
    }

    const qtyValidation = MockEligibilityService.validateProcurementQuantity(reqQtyNum, remainingQty);
    if (!qtyValidation.valid) {
      return {
        success: false,
        errorCode: 'QUOTA_EXCEEDED',
        errorMessage: `REJECTED: Expected quantity (${reqQtyNum} Qtl) must be lower than or equal to the actual available crop quantity for ${cropRec.cropName} (${remainingQty} Qtl). Quota is individual per crop, not based on overall crops.`,
      };
    }

    // 6. Verify centre & 7. Verify centre operating status
    const centreCapValidation = CentreService.validateCapacityForBooking(centre);
    if (!centreCapValidation.valid) {
      return { success: false, errorCode: 'CENTRE_UNAVAILABLE', errorMessage: centreCapValidation.reason };
    }

    // 8. Verify date
    const todayStr = new Date().toISOString().split('T')[0];
    if (!date || date < todayStr) {
      return { success: false, errorCode: 'INVALID_DATE', errorMessage: 'Booking date must be today or in the future.' };
    }

    // 9. Verify slot
    if (slotIdx == null || slotIdx < 0 || slotIdx >= slotTimes.length) {
      return { success: false, errorCode: 'INVALID_SLOT', errorMessage: 'Selected time slot is invalid.' };
    }

    // 10. Verify slot capacity
    const slotCapacityLimit = 20;
    const currentBookedForSlot = slotFillCount;
    const slotStatus = this.getSlotStatus({
      date,
      timeSlotStr: slotTimes[slotIdx],
      bookedCount: currentBookedForSlot,
      capacityLimit: slotCapacityLimit,
      centreStatus: centre.operatingStatus,
    });

    if (slotStatus !== 'AVAILABLE') {
      return {
        success: false,
        errorCode: 'SLOT_UNAVAILABLE',
        errorMessage: 'Sorry, this slot is no longer available.',
        alternativeSlots: slotTimes
          .map((t, idx) => ({ idx, time: t, status: this.getSlotStatus({ date, timeSlotStr: t, bookedCount: 0, capacityLimit: slotCapacityLimit, centreStatus: centre.operatingStatus }) }))
          .filter((s) => s.status === 'AVAILABLE'),
      };
    }

    // 11. Atomic Lock / Reserve Slot (Race Condition Protection)
    const slotKey = `${centre.id}|${date}|${slotIdx}`;
    const acquiredLock = BookingLockEngine.acquireLock(slotKey);
    if (!acquiredLock) {
      return {
        success: false,
        errorCode: 'RACE_CONDITION_LOCK',
        errorMessage: 'Concurrent booking conflict: Another farmer reserved this slot at the exact same moment. Please select an alternate slot.',
      };
    }

    // 12. Create booking record & 13. Generate booking ID & Token
    const bookingId = 'b' + Date.now();
    const token = 'PDC-' + Math.random().toString(16).slice(2, 8).toUpperCase();
    const isCustom = cropRec.cropSource === 'CUSTOM';
    const rate = matchedCrop?.msp || 1500;
    const price = Math.round(reqQtyNum * rate);

    const booking = {
      id: bookingId,
      token,
      farmerId: farmer.farmerId,
      cropId: cropRec.cropId,
      cropRecordId: cropRec.cropRecordId,
      cropCustom: isCustom,
      cropLabel: cropRec.cropName,
      qty: reqQtyNum,
      centreId: centre.id,
      date,
      slotIdx,
      status: 'booked',
      price,
      paymentStatus: isCustom ? 'pending_verification' : 'initiated',
      paymentMethod: bankDetails?.bankName ? `NEFT (${bankDetails.bankName})` : 'NEFT (DBT)',
      checkedIn: false,
      arrivalTime: null,
      createdTimestamp: new Date().toISOString(),
    };

    // Release Lock after successful creation
    BookingLockEngine.releaseLock(slotKey);

    return {
      success: true,
      booking,
    };
  }

  /**
   * Validates state transitions for a booking record.
   * @param {string} currentState
   * @param {string} nextState
   * @returns {boolean}
   */
  static isValidTransition(currentState, nextState) {
    const transitions = {
      booked: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'],
      BOOKED: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED'],
      CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'EXPIRED'],
      CHECKED_IN: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
      EXPIRED: [],
    };
    return (transitions[currentState] || []).includes(nextState);
  }
}
