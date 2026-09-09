/**
 * Phase 11 — Offline Caching & Synchronization Service
 * 
 * Provides:
 * 1. Network status management: 'ONLINE' (4G/5G) | 'SLOW_2G' | 'OFFLINE'
 * 2. Safe local caching (centre directories, active tickets, basic profile)
 * 3. Offline booking pending queue (NEVER confirms slots locally without server validation)
 * 4. Automatic reconnection reconciliation with idempotency keys
 */

class OfflineSyncService {
  constructor() {
    this.networkMode = 'ONLINE'; // 'ONLINE' | 'SLOW_2G' | 'OFFLINE'
    this.pendingQueue = [];
    this.cachedData = {
      centres: [],
      tickets: [],
      profile: null,
    };
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  broadcast(event, payload) {
    this.listeners.forEach((cb) => cb(event, payload, this.networkMode));
  }

  setNetworkMode(mode) {
    const oldMode = this.networkMode;
    this.networkMode = mode;
    this.broadcast('NETWORK_MODE_CHANGED', { oldMode, newMode: mode });

    // If transitioned to ONLINE, trigger auto-sync of pending queue
    if (mode === 'ONLINE' && this.pendingQueue.length > 0) {
      this.syncPendingQueue();
    }
  }

  isOnline() {
    return this.networkMode === 'ONLINE' || this.networkMode === 'SLOW_2G';
  }

  isOffline() {
    return this.networkMode === 'OFFLINE';
  }

  /**
   * Cache safe non-sensitive data
   */
  cacheSafeData(key, data) {
    this.cachedData[key] = data;
  }

  getCachedData(key) {
    return this.cachedData[key] || null;
  }

  /**
   * Critical Offline Rule: Queue booking request as PENDING.
   * NEVER confirm immediately when offline.
   */
  queueOfflineBooking(bookingPayload) {
    const idempotencyKey = `OFFLINE_BOOK_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const pendingItem = {
      idempotencyKey,
      type: 'BOOKING_REQUEST',
      payload: bookingPayload,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'OFFLINE_REQUEST_PENDING',
    };

    this.pendingQueue.push(pendingItem);
    this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
    return pendingItem;
  }

  /**
   * Reconcile and sync pending queue when connection returns
   */
  async syncPendingQueue(onProcessItem) {
    if (this.pendingQueue.length === 0) return [];

    const itemsToSync = [...this.pendingQueue];
    this.pendingQueue = [];

    const syncedResults = [];
    for (const item of itemsToSync) {
      if (onProcessItem) {
        const result = await onProcessItem(item);
        syncedResults.push(result);
      }
    }

    this.broadcast('QUEUE_SYNCED', syncedResults);
    return syncedResults;
  }
}

export const offlineSyncService = new OfflineSyncService();
