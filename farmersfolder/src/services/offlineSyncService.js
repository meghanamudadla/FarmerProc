/**
 * Phase 11 — Offline Caching & Synchronization Service
 * 
 * Provides:
 * 1. Network status management: 'ONLINE' (4G/5G) | 'SLOW_2G' | 'OFFLINE'
 * 2. Safe local caching (centre directories, active tickets, basic profile)
 * 3. Offline booking pending queue (NEVER confirms slots locally without server validation)
 * 4. Automatic reconnection reconciliation with idempotency keys, now backed by IndexedDB
 */

const DB_NAME = 'KisanSevaDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_bookings';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
      }
    };
  });
}

async function savePendingItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingItem(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllPendingItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

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
    
    // Load persisted queue initially
    this.initQueueFromDB();
  }

  async initQueueFromDB() {
    try {
      this.pendingQueue = await getAllPendingItems();
      if (this.pendingQueue.length > 0) {
        this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
        // Automatically try to sync if browser believes currently online
        if (this.isOnline()) {
          this.syncPendingQueue();
        }
      }
    } catch (err) {
      console.warn("Failed to load offline queue from IndexedDB", err);
    }
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
  async queueOfflineBooking(bookingPayload) {
    const idempotencyKey = `OFFLINE_BOOK_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const pendingItem = {
      idempotencyKey,
      type: 'BOOKING_REQUEST',
      payload: bookingPayload,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'OFFLINE_REQUEST_PENDING',
    };

    // Store reliably persisting via native IndexedDB APIs
    await savePendingItem(pendingItem);

    // Keep an in-memory duplicate for immediate UI references
    this.pendingQueue.push(pendingItem);
    this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
    return pendingItem;
  }

  /**
   * Reconcile and sync pending queue when connection returns
   */
  async syncPendingQueue(onProcessItem) {
    if (this.pendingQueue.length === 0) return [];

    // Make shallow clone so array iteration isn't corrupted if elements drop
    const itemsToSync = [...this.pendingQueue];
    const syncedResults = [];

    for (const item of itemsToSync) {
      if (onProcessItem) {
        try {
          const result = await onProcessItem(item);
          
          if (result) {
            syncedResults.push(result);
            await deletePendingItem(item.idempotencyKey);
            this.pendingQueue = this.pendingQueue.filter(i => i.idempotencyKey !== item.idempotencyKey);
          }
        } catch (err) {
          console.warn(`Failed syncing pending item ${item.idempotencyKey}`, err);
          item.status = 'OFFLINE_REQUEST_FAILED';
        }
      }
    }

    this.broadcast('QUEUE_SYNCED', syncedResults);
    this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
    return syncedResults;
  }
}

export const offlineSyncService = new OfflineSyncService();
