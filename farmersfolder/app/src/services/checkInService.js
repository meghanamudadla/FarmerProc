/**
 * CheckInService & Mandi Gate Scanner Engine (Phase 5)
 *
 * Implements the 8-step gate check-in validation pipeline, secure QR payload parsing,
 * duplicate scan protection, wrong centre rejection, expired booking validation,
 * and offline check-in queue synchronization strategy.
 */

export class CheckInService {
  static offlineQueue = [];

  /**
   * Encodes a secure QR payload string containing only non-sensitive tokens.
   * NEVER embeds Aadhaar, bank details, or PII.
   * @param {string} bookingId
   * @param {string} token
   * @returns {string} JSON payload string
   */
  static generateSecureQrPayload(bookingId, token) {
    return JSON.stringify({
      b: bookingId,
      t: token,
      v: 1, // protocol version
    });
  }

  /**
   * Parses a QR code payload safely.
   * @param {string} payloadStr
   * @returns {{ bookingId?: string, token?: string, valid: boolean }}
   */
  static parseSecureQrPayload(payloadStr) {
    try {
      if (!payloadStr) return { valid: false };
      // If payload is already a raw token string (e.g. PDC-F51B1E)
      if (payloadStr.startsWith('PDC-')) {
        return { token: payloadStr, valid: true };
      }
      const parsed = JSON.parse(payloadStr);
      if (parsed && (parsed.b || parsed.t)) {
        return { bookingId: parsed.b, token: parsed.t, valid: true };
      }
      return { valid: false };
    } catch (e) {
      // Fallback if string is raw token
      if (payloadStr && payloadStr.includes('PDC-')) {
        return { token: payloadStr.trim(), valid: true };
      }
      return { valid: false };
    }
  }

  /**
   * 8-Step Mandi Gate Check-In Validation Engine.
   * @param {Object} params
   * @param {string} params.scannedTokenOrPayload
   * @param {string} params.scannerCentreId
   * @param {Array} params.bookings
   * @param {Object} params.farmer
   * @param {boolean} params.isOnline
   * @returns {{ success: boolean, booking?: Object, errorCode?: string, errorMessage?: string, isOfflineQueued?: boolean }}
   */
  static processGateScan({
    scannedTokenOrPayload,
    scannerCentreId = 'c1',
    bookings = [],
    farmer,
    isOnline = true,
  }) {
    // Parse QR payload
    const parsed = this.parseSecureQrPayload(scannedTokenOrPayload);
    if (!parsed.valid) {
      return {
        success: false,
        errorCode: 'INVALID_QR',
        errorMessage: 'Invalid QR Code or Token format.',
      };
    }

    // Step 1: Verify booking exists
    const booking = bookings.find(
      (b) =>
        (parsed.bookingId && b.id === parsed.bookingId) ||
        (parsed.token && b.token === parsed.token)
    );

    if (!booking) {
      return {
        success: false,
        errorCode: 'BOOKING_NOT_FOUND',
        errorMessage: `Booking record not found for Token ${parsed.token || parsed.bookingId}.`,
      };
    }

    // Step 2: Verify booking is not cancelled
    if (booking.status === 'cancelled' || booking.status === 'CANCELLED') {
      return {
        success: false,
        errorCode: 'BOOKING_CANCELLED',
        errorMessage: 'Check-in Rejected: This booking has been cancelled.',
      };
    }

    // Step 3: Verify booking is not already checked in (Duplicate Scan Guard)
    if (booking.checkedIn || booking.status === 'CHECKED_IN' || booking.status === 'completed') {
      return {
        success: false,
        errorCode: 'DUPLICATE_SCAN',
        errorMessage: `Farmer already checked in at ${booking.arrivalTime || 'gate'}. Duplicate queue entry prevented.`,
        booking,
      };
    }

    // Step 4: Verify centre matches scanner mandi location
    if (scannerCentreId && booking.centreId !== scannerCentreId) {
      return {
        success: false,
        errorCode: 'WRONG_CENTRE',
        errorMessage: `Wrong Centre: This booking is registered for Centre ${booking.centreId.toUpperCase()}, not Centre ${scannerCentreId.toUpperCase()}.`,
        booking,
      };
    }

    // Step 5: Verify date is valid (not expired)
    const todayStr = new Date().toISOString().split('T')[0];
    if (booking.date < todayStr) {
      return {
        success: false,
        errorCode: 'BOOKING_EXPIRED',
        errorMessage: `Booking Expired: This slot was scheduled for ${booking.date}. Please book a new slot.`,
        booking,
      };
    }

    // Step 6: Check network connectivity (Offline Scan Strategy)
    if (!isOnline) {
      this.offlineQueue.push({
        bookingId: booking.id,
        token: booking.token,
        scannerCentreId,
        scannedTime: new Date().toISOString(),
      });
      return {
        success: false,
        isOfflineQueued: true,
        errorCode: 'OFFLINE_PENDING',
        errorMessage: 'Network unavailable. Check-in saved offline — pending synchronization when connectivity returns.',
        booking,
      };
    }

    // Step 7 & 8: Check-In Success & Queue Entry Generation
    const arrivalTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const updatedBooking = {
      ...booking,
      checkedIn: true,
      status: 'booked',
      arrivalTime,
      checkedInTimestamp: new Date().toISOString(),
    };

    return {
      success: true,
      booking: updatedBooking,
      arrivalTime,
    };
  }

  /**
   * Synchronizes queued offline check-ins when connectivity returns.
   * @param {Array} bookings
   * @returns {Array} Updated bookings
   */
  static syncOfflineQueue(bookings) {
    if (this.offlineQueue.length === 0) return bookings;

    let updated = [...bookings];
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    this.offlineQueue.forEach((item) => {
      updated = updated.map((b) => {
        if (b.id === item.bookingId && !b.checkedIn) {
          return {
            ...b,
            checkedIn: true,
            arrivalTime: nowStr,
            checkedInTimestamp: item.scannedTime,
          };
        }
        return b;
      });
    });

    this.offlineQueue = [];
    return updated;
  }
}
