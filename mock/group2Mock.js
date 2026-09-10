/**
 * In-Memory Mock Service for Group 2 Backend
 * Simulates Token Generation, Queue Status, Estimated Wait Time (EWT),
 * Slot Cancellation & Smart Waitlist Re-allocation, and Payment Delay tracking.
 */

class Group2Mock {
  constructor() {
    this.tokenCounter = 104;
    this.currentlyServingNumber = 99;
    this.averageMinutesPerToken = 7;
    
    // Store bookings by phone number: phoneNumber -> BookingDetails
    this.bookings = new Map();

    // Pre-populate with sample farmer (Farmer #1) for instant testing
    this.bookings.set('9876543210', {
      tokenId: 'MND-104',
      tokenNumber: 104,
      phoneNumber: '9876543210',
      farmerName: 'రామయ్య (Ramayya)',
      slotTime: '11:00 AM',
      mandiName: 'వరంగల్ మార్కెట్ యార్డ్ (Warangal Mandi)',
      bookedAt: new Date().toISOString(),
      status: 'WAITING'
    });

    // SMART SLOT RE-ALLOCATION QUEUE (Waitlist of farmers)
    this.seedDefaultWaitlist();

    // Store active & completed re-allocation attempts: reallocationId -> Record
    this.reallocations = new Map();

    // ---------------------------------------------------------
    // PAYMENT DELAY AUDIT RECORDS
    // ---------------------------------------------------------
    this.delayedPayments = [
      {
        id: 'PAY-901',
        phoneNumber: '9876543210',
        farmerName: 'రామయ్య (Ramayya)',
        tokenId: 'MND-104',
        procurementId: 'PRC-501',
        amount: 32500,
        delayReason: 'బ్యాంక్ సర్వర్ సాంకేతిక నిర్వహణ (Bank server technical clearance)',
        expectedPayoutDate: '12 సెప్టెంబర్ 2026',
        delayedHours: 54,
        status: 'DELAYED',
        notified: false
      },
      {
        id: 'PAY-902',
        phoneNumber: '9876543211',
        farmerName: 'రమేష్ (Ramesh)',
        tokenId: 'MND-101',
        procurementId: 'PRC-498',
        amount: 45000,
        delayReason: 'ఖజానా నిధుల బదిలీ ప్రక్రియ (Treasury fund transfer processing)',
        expectedPayoutDate: '14 సెప్టెంబర్ 2026',
        delayedHours: 72,
        status: 'DELAYED',
        notified: false
      }
    ];
  }

  seedDefaultWaitlist() {
    this.waitlist = [
      {
        id: 'wl_001',
        phoneNumber: '9876543211',
        farmerName: 'రమేష్ (Ramesh)',
        language: 'te',
        crop: 'వరి (Paddy)',
        quantityQtl: 40,
        queuedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'wl_002',
        phoneNumber: '9876543212',
        farmerName: 'सुरेश कुमार (Suresh Kumar)',
        language: 'hi',
        crop: 'गेहूं (Wheat)',
        quantityQtl: 25,
        queuedAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'wl_003',
        phoneNumber: '9876543213',
        farmerName: 'Kiran Rao',
        language: 'en',
        crop: 'Cotton',
        quantityQtl: 50,
        queuedAt: new Date(Date.now() - 10800000).toISOString()
      }
    ];
    return this.waitlist;
  }

  resetWaitlistAndBookings() {
    this.seedDefaultWaitlist();
    this.bookings.set('9876543210', {
      tokenId: 'MND-104',
      tokenNumber: 104,
      phoneNumber: '9876543210',
      farmerName: 'రామయ్య (Ramayya)',
      slotTime: '11:00 AM',
      mandiName: 'వరంగల్ మార్కెట్ యార్డ్ (Warangal Mandi)',
      bookedAt: new Date().toISOString(),
      status: 'WAITING'
    });
    this.reallocations.clear();
    console.log('[Group 2 Mock] Reset waitlist and demo bookings successfully.');
    return {
      success: true,
      waitlist: this.waitlist,
      bookings: Array.from(this.bookings.values())
    };
  }

  /**
   * Simulates Group 2 Slot Booking
   * @param {string} phoneNumber 
   * @param {object} extraData 
   * @returns {Promise<object>}
   */
  async bookSlot(phoneNumber, extraData = {}) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    this.tokenCounter += 1;
    const tokenNumber = this.tokenCounter;
    const tokenId = `MND-${tokenNumber}`;

    // Calculate dynamic slot time 30 mins from now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const slotTime = `${formattedHours}:${minutes} ${ampm}`;

    const booking = {
      tokenId,
      tokenNumber,
      phoneNumber: cleanPhone,
      farmerName: extraData.farmerName || 'రైతు సోదరా',
      slotTime,
      mandiName: extraData.mandiName || 'రైతు బంధు మార్కెట్ యార్డ్',
      bookedAt: new Date().toISOString(),
      status: 'WAITING'
    };

    this.bookings.set(cleanPhone, booking);

    console.log(`[Group 2 Mock] New Token Generated: ${tokenId} for phone: ${cleanPhone}`);

    return {
      success: true,
      tokenId: booking.tokenId,
      tokenNumber: booking.tokenNumber,
      slotTime: booking.slotTime,
      mandiName: booking.mandiName,
      phoneNumber: booking.phoneNumber
    };
  }

  /**
   * Simulates Group 2 Queue Status Calculation
   * @param {string} phoneNumber 
   * @returns {Promise<object>}
   */
  async getQueueStatus(phoneNumber) {
    const cleanPhone = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
    const booking = this.bookings.get(cleanPhone);

    if (!booking || booking.status === 'CANCELLED') {
      console.log(`[Group 2 Mock] No active token found for phone: ${cleanPhone}`);
      return {
        success: false,
        hasToken: false,
        message: 'No active booking found for this phone number'
      };
    }

    // Compute tokens ahead
    const tokensAhead = Math.max(0, booking.tokenNumber - this.currentlyServingNumber - 1);
    const estimatedWaitTimeMinutes = tokensAhead === 0 ? 5 : tokensAhead * this.averageMinutesPerToken;
    const currentServingToken = `MND-${this.currentlyServingNumber}`;

    console.log(`[Group 2 Mock] Queue Status for ${cleanPhone}: Token ${booking.tokenId}, Ahead: ${tokensAhead}, EWT: ${estimatedWaitTimeMinutes}m`);

    return {
      success: true,
      hasToken: true,
      tokenId: booking.tokenId,
      tokenNumber: booking.tokenNumber,
      currentServingToken,
      tokensAhead,
      estimatedWaitTimeMinutes,
      mandiName: booking.mandiName
    };
  }

  // -------------------------------------------------------------
  // FEATURE 2: SMART SLOT RE-ALLOCATION METHODS
  // -------------------------------------------------------------

  /**
   * Cancels a booked slot and initiates re-allocation to next waiting farmer
   * @param {string} identifier - Phone number or Token ID
   * @param {string} reason - Cancellation reason
   */
  async cancelSlot(identifier, reason = 'Farmer cancelled / No-show') {
    const cleanId = String(identifier || '').replace(/\D/g, '').slice(-10);
    
    // Search by phone or token ID
    let targetBooking = this.bookings.get(cleanId);
    if (!targetBooking) {
      for (const b of this.bookings.values()) {
        if (b.tokenId.toLowerCase() === String(identifier).toLowerCase()) {
          targetBooking = b;
          break;
        }
      }
    }

    if (!targetBooking) {
      // Create fallback slot details so cancellation can be simulated on demand
      targetBooking = {
        tokenId: `MND-104`,
        phoneNumber: cleanId || '9876543210',
        slotTime: '11:00 AM',
        mandiName: 'వరంగల్ మార్కెట్ యార్డ్ (Warangal Mandi)',
        status: 'WAITING'
      };
    }

    targetBooking.status = 'CANCELLED';
    targetBooking.cancelledAt = new Date().toISOString();
    targetBooking.cancelReason = reason;

    console.log(`[Group 2 Mock] Slot ${targetBooking.tokenId} CANCELLED. Triggering Re-allocation...`);

    // Prepare reallocation offer for Farmer #2 (next in waitlist)
    // If waitlist was completely consumed in earlier cycles, automatically replenish demo farmers
    if (!this.waitlist || this.waitlist.length === 0) {
      console.log('[Group 2 Mock] Waitlist empty. Auto-replenishing waitlist queue for demo/testing...');
      this.seedDefaultWaitlist();
    }

    const reallocationId = `realloc_${Date.now()}`;
    const nextFarmer = this.waitlist[0] || null;

    const reallocationRecord = {
      id: reallocationId,
      originalBooking: { ...targetBooking },
      slotDetails: {
        slotTime: targetBooking.slotTime,
        mandiName: targetBooking.mandiName,
        freedTokenId: targetBooking.tokenId
      },
      currentFarmerIndex: 0,
      offeredFarmer: nextFarmer ? { ...nextFarmer } : null,
      status: nextFarmer ? 'OFFERED' : 'EXHAUSTED',
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'SLOT_CANCELLED',
          freedTokenId: targetBooking.tokenId,
          reason
        }
      ]
    };

    if (nextFarmer) {
      reallocationRecord.history.push({
        timestamp: new Date().toISOString(),
        action: 'OFFER_EXTENDED',
        farmer: nextFarmer.farmerName,
        phone: nextFarmer.phoneNumber,
        index: 0
      });
    }

    this.reallocations.set(reallocationId, reallocationRecord);

    return {
      success: true,
      cancelledBooking: targetBooking,
      reallocationId,
      nextFarmer,
      slotDetails: reallocationRecord.slotDetails
    };
  }

  /**
   * Processes DTMF response (1=Accept, 2=Decline) for a slot reallocation offer
   * If declined, automatically cascades to next queued farmer
   * @param {string} reallocationId 
   * @param {'1' | '2' | 'ACCEPT' | 'DECLINE'} decision 
   */
  async handleReallocationResponse(reallocationId, decision) {
    const record = this.reallocations.get(reallocationId);
    if (!record) {
      return { success: false, message: 'Re-allocation session not found or expired' };
    }

    const isAccept = decision === '1' || decision === 'ACCEPT';
    const isDecline = decision === '2' || decision === 'DECLINE';
    const currentFarmer = record.offeredFarmer;

    if (isAccept) {
      // 1. Assign slot to Farmer #2
      this.tokenCounter += 1;
      const newTokenId = `MND-${this.tokenCounter}`;

      const newBooking = {
        tokenId: newTokenId,
        tokenNumber: this.tokenCounter,
        phoneNumber: currentFarmer.phoneNumber,
        farmerName: currentFarmer.farmerName,
        slotTime: record.slotDetails.slotTime,
        mandiName: record.slotDetails.mandiName,
        bookedAt: new Date().toISOString(),
        status: 'CONFIRMED_REALLOCATED',
        reallocatedFrom: record.slotDetails.freedTokenId
      };

      this.bookings.set(currentFarmer.phoneNumber, newBooking);

      record.status = 'ACCEPTED';
      record.assignedBooking = newBooking;
      record.history.push({
        timestamp: new Date().toISOString(),
        action: 'OFFER_ACCEPTED',
        farmer: currentFarmer.farmerName,
        phone: currentFarmer.phoneNumber,
        newTokenId
      });

      // Remove accepted farmer from waitlist
      this.waitlist = this.waitlist.filter(f => f.phoneNumber !== currentFarmer.phoneNumber);

      console.log(`[Group 2 Mock] Farmer ${currentFarmer.farmerName} ACCEPTED slot! Assigned Token: ${newTokenId}`);

      return {
        success: true,
        action: 'ACCEPTED',
        farmer: currentFarmer,
        booking: newBooking,
        tokenId: newTokenId,
        slotTime: newBooking.slotTime,
        mandiName: newBooking.mandiName
      };
    }

    if (isDecline) {
      record.history.push({
        timestamp: new Date().toISOString(),
        action: 'OFFER_DECLINED',
        farmer: currentFarmer.farmerName,
        phone: currentFarmer.phoneNumber
      });

      console.log(`[Group 2 Mock] Farmer ${currentFarmer.farmerName} DECLINED slot. Cascading to next farmer...`);

      // Advance to next farmer in line (e.g. Farmer #3)
      record.currentFarmerIndex += 1;
      const nextFarmer = this.waitlist[record.currentFarmerIndex] || null;

      if (nextFarmer) {
        record.offeredFarmer = nextFarmer;
        record.status = 'OFFERED';
        record.history.push({
          timestamp: new Date().toISOString(),
          action: 'OFFER_EXTENDED',
          farmer: nextFarmer.farmerName,
          phone: nextFarmer.phoneNumber,
          index: record.currentFarmerIndex
        });

        console.log(`[Group 2 Mock] Cascaded offer to Farmer #${record.currentFarmerIndex + 1}: ${nextFarmer.farmerName} (${nextFarmer.phoneNumber})`);

        return {
          success: true,
          action: 'DECLINED_AND_CASCADED',
          declinedFarmer: currentFarmer,
          nextFarmer,
          cascaded: true,
          reallocationId,
          slotDetails: record.slotDetails
        };
      } else {
        // No more farmers in waitlist
        record.status = 'EXHAUSTED';
        record.offeredFarmer = null;

        console.log(`[Group 2 Mock] Waitlist queue exhausted. No more farmers to offer.`);

        return {
          success: true,
          action: 'DECLINED_QUEUE_EXHAUSTED',
          declinedFarmer: currentFarmer,
          cascaded: false,
          reallocationId,
          message: 'All queued farmers have been offered or declined the slot.'
        };
      }
    }

    return { success: false, message: 'Invalid decision input (expected 1 or 2)' };
  }

  // -------------------------------------------------------------
  // FEATURE 1: PAYMENT DELAY METHODS
  // -------------------------------------------------------------

  getDelayedPayments() {
    return this.delayedPayments;
  }

  markPaymentNotified(paymentId) {
    const p = this.delayedPayments.find(item => item.id === paymentId);
    if (p) {
      p.notified = true;
      p.notifiedAt = new Date().toISOString();
      return p;
    }
    return null;
  }

  // -------------------------------------------------------------
  // STATUS & AUDIT HELPERS
  // -------------------------------------------------------------

  getWaitlist() {
    return this.waitlist;
  }

  getReallocations() {
    return Array.from(this.reallocations.values());
  }

  getAllBookings() {
    return Array.from(this.bookings.values());
  }

  reset() {
    this.bookings.clear();
    this.tokenCounter = 100;
    this.currentlyServingNumber = 95;
    this.reallocations.clear();
  }
}

// Export singleton instance
module.exports = new Group2Mock();
