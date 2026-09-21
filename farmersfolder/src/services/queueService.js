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
    this.ws = null;
    this.centerId = null;
    this.bookingId = null;
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    
    this.config = {
      activeCounters: 2,
      avgProcessingTimeMin: 15,
      noShowGracePeriodMin: 20, 
    };
  }

  // --- NATIVE WEBSOCKET INTEGRATION ---
  connect(centerId, bookingId) {
    if (this.ws && String(this.centerId) === String(centerId) && String(this.bookingId) === String(bookingId)) return;
    
    this.disconnect();
    this.centerId = centerId;
    this.bookingId = String(bookingId);
    this.shouldReconnect = true;
    
    let wsUrl;
    try {
      const apiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000';
      const parsed = new URL(apiUrl);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//${parsed.host}/center/${centerId}/ws`;
    } catch {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const baseUrl = 'localhost:8000';
      wsUrl = `${protocol}//${baseUrl}/center/${centerId}/ws`;
    }
    
    this._initSocket(wsUrl);
  }

  _initSocket(url) {
    if (this.ws) this.ws.close();
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => { this.reconnectAttempts = 0; console.log("Farmer WS Connected"); };
      
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Privacy Filter: Strip noise impacting other bookings unless it's a global Queue Update!
          if (String(payload.booking_id) === this.bookingId || payload.event === 'NEXT_FARMER_ASSIGNED') {
            this.broadcast('QUEUE_STATE_CHANGED', payload);
          }
        } catch (err) {}
      };
      
      this.ws.onclose = () => {
        if (this.shouldReconnect) {
          const delay = Math.min(2500, 1000 * Math.pow(2, this.reconnectAttempts));
          this.reconnectAttempts++;
          setTimeout(() => this._initSocket(url), delay);
        }
      };
      
      this.ws.onerror = (err) => { this.ws.close(); };
    } catch (err) {}
  }
  
  disconnect() {
      this.shouldReconnect = false;
      if (this.ws) {
          this.ws.close();
          this.ws = null;
      }
      this.centerId = null;
      this.bookingId = null;
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
   * Calculate Estimated Wait Time Range String natively from WS payload
   */
  calculateWaitTimeRange(farmersAhead, wsEstimatedMinutes = null) {
    if (wsEstimatedMinutes !== null && wsEstimatedMinutes !== undefined) {
       return {
          range: `~${wsEstimatedMinutes} mins`,
          min: Math.max(0, wsEstimatedMinutes - 3),
          max: wsEstimatedMinutes + 5
       };
    }
    
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
   * Format natively fetched WS properties without iterating legacy array lists fully 
   */
  getQueueMetrics(queueList = [], activeBooking = null) {
    const defaultRes = {
      currentProcessingToken: 'N/A',
      nextProcessingToken: 'N/A',
      farmersAhead: 0,
      estWaitTimeRange: '-',
      activeCounters: this.config.activeCounters,
      avgProcessingTimeMin: this.config.avgProcessingTimeMin,
      noShowGracePeriodMin: this.config.noShowGracePeriodMin,
    };
    
    if (!activeBooking) return defaultRes;

    const farmersAhead = activeBooking.queue_position !== undefined 
                           && activeBooking.queue_position !== null 
                           ? Math.max(0, activeBooking.queue_position - 1) 
                           : this.getFarmersAhead(queueList, activeBooking);
                           
    const waitTime = this.calculateWaitTimeRange(farmersAhead, activeBooking.estimated_wait_minutes);

    return {
      ...defaultRes,
      farmersAhead,
      estWaitTimeRange: waitTime.range,
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
