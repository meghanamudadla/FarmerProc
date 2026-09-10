/**
 * Smart Slot Booking Engine
 *
 * Handles:
 * - Frontend booking validation
 * - Double-booking protection
 * - Crop ownership and quantity validation
 * - Centre validation
 * - Slot validation
 * - Local race-condition protection
 * - Booking state transitions
 * - Backend booking creation through FastAPI
 */

import { MockEligibilityService } from "./eligibilityService.js";
import { CentreService } from "./centreService.js";
import { apiRequest } from "./api.js";


export const BOOKING_STATES = {
  BOOKED: "BOOKED",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
  EXPIRED: "EXPIRED",
};


/* =========================================================
   SIMULATED ATOMIC LOCK
   ========================================================= */

export class BookingLockEngine {
  static locks = new Set();

  /**
   * Attempts to acquire an atomic lock on a specific slot key.
   *
   * @param {string} slotKey
   * @returns {boolean}
   */
  static acquireLock(slotKey) {
    if (this.locks.has(slotKey)) {
      return false;
    }

    this.locks.add(slotKey);

    // Safety release after 2 seconds
    setTimeout(() => {
      this.locks.delete(slotKey);
    }, 2000);

    return true;
  }

  /**
   * Releases a slot lock.
   *
   * @param {string} slotKey
   */
  static releaseLock(slotKey) {
    this.locks.delete(slotKey);
  }
}


/* =========================================================
   BOOKING ENGINE
   ========================================================= */

export class BookingEngine {

  /* =======================================================
     GET ACTIVE BOOKING
     ======================================================= */

  /**
   * Checks whether the farmer already has an active booking.
   *
   * @param {Array} bookings
   * @returns {Object|null}
   */
  static getActiveBooking(bookings = []) {
    return (
      bookings.find((booking) => {
        const status = String(booking?.status || "").toUpperCase();

        return (
          status === BOOKING_STATES.BOOKED ||
          status === BOOKING_STATES.CONFIRMED ||
          (
            status === BOOKING_STATES.CHECKED_IN &&
            booking?.paymentStatus !== "credited"
          )
        );
      }) || null
    );
  }


  /* =======================================================
     SLOT STATUS
     ======================================================= */

  /**
   * Calculates slot status.
   *
   * @param {Object} params
   * @returns {"AVAILABLE"|"FULL"|"CLOSED"|"EXPIRED"}
   */
  static getSlotStatus({
    date,
    timeSlotStr,
    bookedCount,
    capacityLimit = 20,
    centreStatus,
  }) {
    if (centreStatus !== "OPEN") {
      return "CLOSED";
    }

    const todayStr = new Date().toISOString().split("T")[0];

    if (date < todayStr) {
      return "EXPIRED";
    }

    if (bookedCount >= capacityLimit) {
      return "FULL";
    }

    return "AVAILABLE";
  }


  /* =======================================================
     FRONTEND VALIDATION + PROCESSING
     ======================================================= */

  /**
   * Performs the frontend validation pipeline.
   *
   * NOTE:
   * This method validates the booking locally.
   * The actual database booking is created through
   * createBackendBooking().
   *
   * @param {Object} params
   * @returns {{
   *   success: boolean,
   *   booking?: Object,
   *   errorCode?: string,
   *   errorMessage?: string,
   *   alternativeSlots?: Array
   * }}
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

    /* -------------------------------------------------------
       1. Authenticate farmer
       ------------------------------------------------------- */

    if (!farmer || !farmer.farmerId) {
      return {
        success: false,
        errorCode: "UNAUTHENTICATED",
        errorMessage: "Authenticated farmer profile required.",
      };
    }


    /* -------------------------------------------------------
       2. Double booking check
       ------------------------------------------------------- */

    if (!allowOverrideActiveBooking) {
      const activeBooking = this.getActiveBooking(existingBookings);

      if (activeBooking) {
        return {
          success: false,
          errorCode: "DOUBLE_BOOKING",
          errorMessage:
            "You already have an active procurement booking. Complete or cancel your existing booking first.",
        };
      }
    }


    /* -------------------------------------------------------
       3. Verify crop ownership
       ------------------------------------------------------- */

    const farmerId = farmer.farmerId;

    const cropRec =
      (
        matchedCrop?.cropRecordId &&
        crops.find(
          (crop) =>
            (farmerId ? crop.farmerId === farmerId : true) &&
            crop.cropRecordId === matchedCrop.cropRecordId
        )
      ) ||
      (
        matchedCrop?.cropRecordId &&
        crops.find(
          (crop) =>
            crop.cropRecordId === matchedCrop.cropRecordId
        )
      ) ||
      crops.find(
        (crop) =>
          (farmerId ? crop.farmerId === farmerId : true) &&
          (
            crop.cropRecordId === matchedCrop?.cropRecordId ||
            crop.cropId === matchedCrop?.id ||
            crop.cropName === matchedCrop?.en
          )
      );


    if (!cropRec) {
      return {
        success: false,
        errorCode: "UNVERIFIED_CROP",
        errorMessage:
          "The selected crop is not registered under your farmer profile. Only registered crops can be booked.",
      };
    }


    /* -------------------------------------------------------
       3A. Verify crop status
       ------------------------------------------------------- */

    const cropStatus = String(cropRec.status || "").toUpperCase();

    if (
      cropStatus === "INACTIVE" ||
      cropStatus === "ARCHIVED"
    ) {
      return {
        success: false,
        errorCode: "INACTIVE_CROP",
        errorMessage:
          `The crop "${cropRec.cropName}" is inactive/archived and no longer available for new bookings.`,
      };
    }


    if (
      cropStatus === "COMPLETED" ||
      (
        cropRec.remainingQuantity != null &&
        cropRec.remainingQuantity <= 0
      )
    ) {
      return {
        success: false,
        errorCode: "COMPLETED_CROP",
        errorMessage:
          `Procurement for "${cropRec.cropName}" has already been fully completed. No remaining quota exists for booking.`,
      };
    }


    /* -------------------------------------------------------
       4. Verify quantity
       ------------------------------------------------------- */

    const remainingQty =
      cropRec.remainingQuantity != null
        ? Number(cropRec.remainingQuantity)
        : MockEligibilityService.calculateRemaining(
            cropRec.eligibleQty,
            cropRec.alreadyProcuredQty
          );

    const reqQtyNum = parseFloat(requestedQty) || 0;


    if (reqQtyNum <= 0) {
      return {
        success: false,
        errorCode: "INVALID_QUANTITY",
        errorMessage:
          "Procurement quantity must be greater than zero.",
      };
    }


    const qtyValidation =
      MockEligibilityService.validateProcurementQuantity(
        reqQtyNum,
        remainingQty
      );


    if (!qtyValidation.valid) {
      return {
        success: false,
        errorCode: "QUOTA_EXCEEDED",
        errorMessage:
          `REJECTED: Expected quantity (${reqQtyNum} Qtl) must be lower than or equal to the actual available crop quantity for ${cropRec.cropName} (${remainingQty} Qtl). Quota is individual per crop, not based on overall crops.`,
      };
    }


    /* -------------------------------------------------------
       5. Verify centre
       ------------------------------------------------------- */

    const centreCapValidation =
      CentreService.validateCapacityForBooking(centre);


    if (!centreCapValidation.valid) {
      return {
        success: false,
        errorCode: "CENTRE_UNAVAILABLE",
        errorMessage: centreCapValidation.reason,
      };
    }


    /* -------------------------------------------------------
       6. Verify date
       ------------------------------------------------------- */

    const todayStr = new Date().toISOString().split("T")[0];

    if (!date || date < todayStr) {
      return {
        success: false,
        errorCode: "INVALID_DATE",
        errorMessage:
          "Booking date must be today or in the future.",
      };
    }


    /* -------------------------------------------------------
       7. Verify slot
       ------------------------------------------------------- */

    if (
      slotIdx == null ||
      slotIdx < 0 ||
      slotIdx >= slotTimes.length
    ) {
      return {
        success: false,
        errorCode: "INVALID_SLOT",
        errorMessage:
          "Selected time slot is invalid.",
      };
    }


    /* -------------------------------------------------------
       8. Verify slot capacity
       ------------------------------------------------------- */

    const slotCapacityLimit = 20;

    const currentBookedForSlot = slotFillCount;

    const slotStatus = this.getSlotStatus({
      date,
      timeSlotStr: slotTimes[slotIdx],
      bookedCount: currentBookedForSlot,
      capacityLimit: slotCapacityLimit,
      centreStatus: centre.operatingStatus,
    });


    if (slotStatus !== "AVAILABLE") {
      return {
        success: false,
        errorCode: "SLOT_UNAVAILABLE",
        errorMessage:
          "Sorry, this slot is no longer available.",
        alternativeSlots: slotTimes
          .map((time, idx) => ({
            idx,
            time,
            status: this.getSlotStatus({
              date,
              timeSlotStr: time,
              bookedCount: 0,
              capacityLimit: slotCapacityLimit,
              centreStatus: centre.operatingStatus,
            }),
          }))
          .filter(
            (slot) => slot.status === "AVAILABLE"
          ),
      };
    }


    /* -------------------------------------------------------
       9. Local atomic lock
       ------------------------------------------------------- */

    const slotKey =
      `${centre.id}|${date}|${slotIdx}`;

    const acquiredLock =
      BookingLockEngine.acquireLock(slotKey);


    if (!acquiredLock) {
      return {
        success: false,
        errorCode: "RACE_CONDITION_LOCK",
        errorMessage:
          "Concurrent booking conflict: Another farmer reserved this slot at the exact same moment. Please select an alternate slot.",
      };
    }


    /* -------------------------------------------------------
       10. Create frontend representation
       ------------------------------------------------------- */

    const bookingId =
      "local-" + Date.now();

    const token =
      "PDC-" +
      Math.random()
        .toString(16)
        .slice(2, 8)
        .toUpperCase();

    const isCustom =
      cropRec.cropSource === "CUSTOM";

    const rate =
      matchedCrop?.msp || 1500;

    const price =
      Math.round(reqQtyNum * rate);


    const booking = {
      id: bookingId,

      token,

      farmerId:
        farmer.farmerId,

      cropId:
        cropRec.cropId,

      cropRecordId:
        cropRec.cropRecordId,

      cropCustom:
        isCustom,

      cropLabel:
        cropRec.cropName,

      qty:
        reqQtyNum,

      centreId:
        centre.id,

      date,

      slotIdx,

      status:
        "BOOKED",

      price,

      paymentStatus:
        isCustom
          ? "pending_verification"
          : "initiated",

      paymentMethod:
        bankDetails?.bankName
          ? `NEFT (${bankDetails.bankName})`
          : "NEFT (DBT)",

      checkedIn:
        false,

      arrivalTime:
        null,

      createdTimestamp:
        new Date().toISOString(),

      /* Indicates this object has not yet been saved
         to the backend. */
      backendSynced:
        false,
    };


    BookingLockEngine.releaseLock(slotKey);


    return {
      success: true,
      booking,
    };
  }


  /* =======================================================
     CREATE BOOKING IN FASTAPI
     ======================================================= */

  /**
   * Creates the actual booking in the FastAPI backend.
   *
   * Backend endpoint:
   * POST /bookings/
   *
   * IMPORTANT:
   * centerId, cropId and slotId must be the actual
   * PostgreSQL IDs expected by the backend.
   *
   * @param {Object} params
   * @param {number} params.centerId
   * @param {number} params.cropId
   * @param {number} params.quantity
   * @param {string} params.bookingDate
   * @param {number} params.slotId
   * @returns {Promise<Object>}
   */
  static async createBackendBooking({
    centerId,
    cropId,
    quantity,
    bookingDate,
    slotId,
  }) {

    if (!centerId) {
      throw new Error(
        "Backend center ID is required."
      );
    }

    if (!cropId) {
      throw new Error(
        "Backend crop ID is required."
      );
    }

    if (!quantity || Number(quantity) <= 0) {
      throw new Error(
        "Booking quantity must be greater than zero."
      );
    }

    if (!bookingDate) {
      throw new Error(
        "Booking date is required."
      );
    }

    if (!slotId) {
      throw new Error(
        "Backend slot ID is required."
      );
    }


    const bookingData = {
      center_id: Number(centerId),
      crop_id: Number(cropId),
      quantity: Number(quantity),
      booking_date: bookingDate,
      slot_id: Number(slotId),
    };


    const backendBooking =
      await apiRequest("/bookings/", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });


    return backendBooking;
  }


  /* =======================================================
     GET FARMER BOOKINGS FROM BACKEND
     ======================================================= */

  /**
   * Gets the authenticated farmer's bookings.
   *
   * Backend endpoint:
   * GET /bookings/my
   *
   * @returns {Promise<Array>}
   */
  static async getMyBackendBookings() {
    return apiRequest("/bookings/my");
  }


  /* =======================================================
     GET SINGLE BACKEND BOOKING
     ======================================================= */

  /**
   * Gets one booking belonging to the authenticated farmer.
   *
   * @param {number} bookingId
   * @returns {Promise<Object>}
   */
  static async getBackendBooking(bookingId) {

    if (!bookingId) {
      throw new Error(
        "Booking ID is required."
      );
    }

    return apiRequest(
      `/bookings/${bookingId}`
    );
  }


  /* =======================================================
     BOOKING STATE TRANSITIONS
     ======================================================= */

  /**
   * Validates state transitions.
   *
   * @param {string} currentState
   * @param {string} nextState
   * @returns {boolean}
   */
  static isValidTransition(
    currentState,
    nextState
  ) {

    const normalizedCurrentState =
      String(currentState || "").toUpperCase();

    const normalizedNextState =
      String(nextState || "").toUpperCase();


    const transitions = {

      BOOKED: [
        "CONFIRMED",
        "CHECKED_IN",
        "CANCELLED",
        "EXPIRED",
      ],

      CONFIRMED: [
        "CHECKED_IN",
        "CANCELLED",
        "EXPIRED",
      ],

      CHECKED_IN: [
        "COMPLETED",
        "CANCELLED",
      ],

      COMPLETED: [],

      CANCELLED: [],

      NO_SHOW: [],

      EXPIRED: [],
    };


    return (
      transitions[normalizedCurrentState] || []
    ).includes(normalizedNextState);
  }
}