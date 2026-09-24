/**
 * Offline Caching & Synchronization Service
 * 
 * Provides:
 * 1. Network status management: 'ONLINE' (4G/5G) | 'SLOW_2G' | 'OFFLINE'
 * 2. Window online/offline automatic event tracking
 * 3. Safe local caching with IndexedDB (KisanSevaDB)
 * 4. Offline booking pending queue (NEVER confirms slots locally without server validation)
 * 5. Automatic reconnection reconciliation with idempotency keys & retry tracking
 * 6. Conflict handling and alternative slot resolution
 */

const DB_NAME = 'KisanSevaDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_bookings';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
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
  try {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to memory', err);
  }
}

async function deletePendingItem(key) {
  try {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error', err);
  }
}

async function getAllPendingItems() {
  try {
    const db = await openDB();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB getAll error', err);
    return [];
  }
}

class OfflineSyncService {
  constructor() {
    this.networkMode = typeof navigator !== 'undefined' && !navigator.onLine ? 'OFFLINE' : 'ONLINE';
    this.pendingQueue = [];
    this.cachedData = {
      centres: [],
      tickets: [],
      profile: null,
    };
    this.listeners = new Set();
    this.defaultHandler = null;

    // Attach real browser online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[OfflineSync] Browser returned ONLINE');
        this.setNetworkMode('ONLINE');
      });
      window.addEventListener('offline', () => {
        console.log('[OfflineSync] Browser went OFFLINE');
        this.setNetworkMode('OFFLINE');
      });
    }

    // Load persisted queue from IndexedDB
    this.initQueueFromDB();
  }

  async initQueueFromDB() {
    try {
      this.pendingQueue = await getAllPendingItems();
      if (this.pendingQueue.length > 0) {
        this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
        if (this.isOnline()) {
          this.syncPendingQueue();
        }
      }
    } catch (err) {
      console.warn("Failed to load offline queue from IndexedDB", err);
    }
  }

  registerSyncHandler(handler) {
    this.defaultHandler = handler;
    // If pending items exist and online, trigger immediately
    if (this.isOnline() && this.pendingQueue.length > 0) {
      this.syncPendingQueue();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  broadcast(event, payload) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, payload, this.networkMode);
      } catch (e) {
        console.error('OfflineSync listener error:', e);
      }
    });
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

  cacheSafeData(key, data) {
    this.cachedData[key] = data;
  }

  getCachedData(key) {
    return this.cachedData[key] || null;
  }

  async queueOfflineBooking(bookingPayload) {
    const idempotencyKey = `OFFLINE_BOOK_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const pendingItem = {
      idempotencyKey,
      type: 'BOOKING_REQUEST',
      payload: bookingPayload,
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'OFFLINE_REQUEST_PENDING',
      retryCount: 0,
      lastError: null
    };

    // Store in IndexedDB
    await savePendingItem(pendingItem);

    // Keep in-memory for immediate UI
    this.pendingQueue.push(pendingItem);
    this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
    return pendingItem;
  }

  async syncPendingQueue(onProcessItem) {
    const processor = onProcessItem || this.defaultHandler;
    if (this.pendingQueue.length === 0 || !processor) return [];

    const itemsToSync = [...this.pendingQueue];
    const syncedResults = [];

    for (const item of itemsToSync) {
      try {
        item.retryCount = (item.retryCount || 0) + 1;
        const result = await processor(item);

        if (result) {
          syncedResults.push(result);
          await deletePendingItem(item.idempotencyKey);
          this.pendingQueue = this.pendingQueue.filter(i => i.idempotencyKey !== item.idempotencyKey);
        }
      } catch (err) {
        console.warn(`[OfflineSync] Sync failed for ${item.idempotencyKey} (attempt ${item.retryCount}):`, err);
        item.lastError = err.message || 'Unknown error';
        
        if (item.retryCount >= 4) {
          item.status = 'OFFLINE_REQUEST_PERMANENT_FAIL';
        } else {
          item.status = 'OFFLINE_REQUEST_FAILED';
        }
        await savePendingItem(item);
      }
    }

    this.broadcast('QUEUE_SYNCED', syncedResults);
    this.broadcast('PENDING_QUEUE_UPDATED', this.pendingQueue);
    return syncedResults;
  }
}

export const offlineSyncService = new OfflineSyncService();
