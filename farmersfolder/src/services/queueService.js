/**
 * Phase 6 — Real-Time Queue Management & Pub/Sub Event Service
 * 
 * Provides:
 * 1. Queue state transition engine: CHECKED_IN -> WAITING -> CALLED -> PROCESSING -> COMPLETED / NO_SHOW
 * 2. Immutability & ordering algorithms (strictly by check-in time & sequence)
 * 3. Real-time WebSocket/PubSub event emitter simulation (subscribers get notified instantly)
 * 4. Dynamic estimated wait time range formula (Farmers Ahead * Avg Processing Time / Active Counters)
 * 5. Configurable No-Show grace period policy engine
 */

class QueueService {
  constructor() {
    this.listeners = new Set();
    this.config = {
      activeCounters: 2,
      avgProcessingTimeMin: 15,
      noShowGracePeriodMin: 20, // minutes allowed after calling before marking NO_SHOW
    };
  }

  // --- PUB / SUB REAL-TIME EVENT BUS ---
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  broadcast(event, payload) {
    this.listeners.forEach((cb) => cb(event, payload));
  }

  // --- QUEUE ORDERING & INDEX MATH ---

  /**
   * Sort queue entries immutably by check-in time & token sequence
   */
  sortQueue(queueEntries = []) {
    return [...queueEntries].sort((a, b) => {
      // Prioritize checked-in over non-checked-in
      if (a.checkedIn !== b.checkedIn) return a.checkedIn ? -1 : 1;

      // Primary sort by arrival timestamp if available
      if (a.arrivalTime && b.arrivalTime) {
        return a.arrivalTime.localeCompare(b.arrivalTime);
      }
      return (a.token || '').localeCompare(b.token || '');
    });
  }

  /**
   * Calculate number of farmers ahead of active token
   */
  getFarmersAhead(queueList = [], activeToken) {
    if (!activeToken) return 0;

    const sorted = this.sortQueue(queueList.filter((b) => b.checkedIn && b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'no_show'));
    const targetIdx = sorted.findIndex((b) => b.token === activeToken.token || b.id === activeToken.id);

    if (targetIdx === -1) return 0;

    // Count how many are ahead and currently serving/waiting
    const ahead = sorted.slice(0, targetIdx).filter((b) => b.status === 'checked_in' || b.status === 'waiting' || b.status === 'called');
    return ahead.length;
  }

  /**
   * Calculate Estimated Wait Time Range String
   * Formula: (Farmers Ahead * Avg Time) / Active Counters
   * Returns range string: "20–30 minutes"
   */
  calculateWaitTimeRange(farmersAhead) {
    if (farmersAhead <= 0) return { range: '0–5 mins', min: 0, max: 5 };

    const totalMinutesNeeded = (farmersAhead * this.config.avgProcessingTimeMin) / Math.max(1, this.config.activeCounters);
    const minEst = Math.max(5, Math.floor(totalMinutesNeeded - 3));
    const maxEst = Math.ceil(totalMinutesNeeded + 7);

    return {
      range: `${minEst}–${maxEst} mins`,
      min: minEst,
      max: maxEst,
    };
  }

  /**
   * Retrieve current token being processed and next token in line
   */
  getQueueMetrics(queueList = [], activeBooking = null) {
    const active = queueList.filter((b) => b.checkedIn && b.status !== 'completed' && b.status !== 'cancelled' && b.status !== 'no_show');
    const sorted = this.sortQueue(active);

    const currentlyProcessing = sorted.find((b) => b.status === 'processing') || sorted.find((b) => b.status === 'called') || sorted[0] || null;
    const nextInLine = sorted.find((b) => b.status === 'waiting' || b.status === 'checked_in') || null;

    const farmersAhead = activeBooking ? this.getFarmersAhead(queueList, activeBooking) : 0;
    const waitTime = this.calculateWaitTimeRange(farmersAhead);

    return {
      currentProcessingToken: currentlyProcessing ? currentlyProcessing.token : 'PDC-098',
      nextProcessingToken: nextInLine ? nextInLine.token : 'PDC-099',
      farmersAhead,
      estWaitTimeRange: waitTime.range,
      activeCounters: this.config.activeCounters,
      avgProcessingTimeMin: this.config.avgProcessingTimeMin,
      noShowGracePeriodMin: this.config.noShowGracePeriodMin,
    };
  }

  // --- STATE TRANSITIONS ---

  /**
   * Advance token queue state
   * State machine: CHECKED_IN -> WAITING -> CALLED -> PROCESSING -> COMPLETED / NO_SHOW
   */
  transitionStatus(booking, newStatus, counterNum = 1) {
    const current = (booking.status || 'checked_in').toLowerCase();
    const target = newStatus.toLowerCase();

    const updated = {
      ...booking,
      status: target,
      counterNumber: counterNum,
      lastUpdatedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (target === 'called') {
      updated.calledTimestamp = Date.now();
    } else if (target === 'no_show') {
      updated.noShowReason = `Grace period (${this.config.noShowGracePeriodMin}m) elapsed without responding at counter.`;
    }

    this.broadcast('QUEUE_STATE_CHANGED', { bookingId: booking.id, token: booking.token, oldStatus: current, newStatus: target, updatedBooking: updated });
    return updated;
  }

  /**
   * Check if booking has exceeded No-Show grace period
   */
  isNoShowGracePeriodExpired(booking) {
    if (booking.status !== 'called' || !booking.calledTimestamp) return false;
    const elapsedMinutes = (Date.now() - booking.calledTimestamp) / (1000 * 60);
    return elapsedMinutes > this.config.noShowGracePeriodMin;
  }

  updateConfig(newConfig = {}) {
    this.config = { ...this.config, ...newConfig };
    this.broadcast('CONFIG_UPDATED', this.config);
  }
}

export const queueService = new QueueService();
