/**
 * LiveQueueSocket – Enterprise WebSocket client for Mandi & Center Queue monitoring.
 * Features:
 * - Exponential backoff reconnection
 * - Heartbeat ping / pong with stale connection detection
 * - Connection status reporting ('connected' | 'connecting' | 'reconnecting' | 'disconnected')
 * - Automatic re-synchronization on reconnection
 * - Fallback periodic sync polling when offline
 */
class LiveQueueSocket {
  constructor() {
    this.ws = null;
    this.centerId = null;
    this.reconnectAttempts = 0;
    this.messageListeners = new Set();
    this.statusListeners = new Set();
    this.reconnectListeners = new Set();
    this.status = 'disconnected';
    this.shouldReconnect = true;
    this.pingInterval = null;
    this.pongTimeout = null;
    this.reconnectTimer = null;
    this.fallbackPollTimer = null;
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((cb) => {
        try { cb(newStatus); } catch (e) { console.error('Status listener err:', e); }
      });
    }
  }

  connect(centerId) {
    if (this.ws && this.centerId === centerId && (this.status === 'connected' || this.status === 'connecting')) {
      return;
    }

    this.centerId = centerId;
    this.shouldReconnect = true;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    let wsUrl;
    try {
      const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
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
    this._clearTimers();

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {
        // ignore
      }
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[WebSocket] Connected to center queue socket: /center/${this.centerId}/ws`);
        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this._stopFallbackPolling();
        this._startHeartbeat();

        // If this was a reconnection, inform listeners to fetch latest authoritative state
        if (wasReconnecting) {
          console.log('[WebSocket] Reconnected! Triggering state synchronization.');
          this.reconnectListeners.forEach((cb) => {
            try { cb(); } catch (e) { console.error('Reconnect listener err:', e); }
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle heartbeat pong
          if (payload.type === 'pong') {
            this._resetPongTimeout();
            return;
          }

          // Dispatch queue event to subscribers
          this.messageListeners.forEach((cb) => {
            try { cb(payload); } catch (e) { console.error('Message listener err:', e); }
          });
        } catch (err) {
          console.warn('[WebSocket] Unparsable message payload:', event.data);
        }
      };

      this.ws.onclose = (ev) => {
        console.warn(`[WebSocket] Disconnected (code: ${ev.code}).`);
        this._clearTimers();

        if (this.shouldReconnect) {
          this.setStatus('reconnecting');
          this._startFallbackPolling();

          // Exponential backoff with jitter (1s, 1.5s, 2.25s, ... capped at 12s)
          const baseDelay = Math.min(12000, 1000 * Math.pow(1.5, this.reconnectAttempts));
          const jitter = Math.random() * 500;
          const delay = baseDelay + jitter;
          this.reconnectAttempts++;

          console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})...`);
          this.reconnectTimer = setTimeout(() => this._initSocket(url), delay);
        } else {
          this.setStatus('disconnected');
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Transport error:', err);
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      console.warn('[WebSocket] Failed initializing socket:', e);
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._initSocket(url), 3000);
      }
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          // Expect pong within 10s or consider stale
          this.pongTimeout = setTimeout(() => {
            console.warn('[WebSocket] Heartbeat timeout: No pong received. Reconnecting...');
            if (this.ws) this.ws.close();
          }, 10000);
        } catch (e) {
          if (this.ws) this.ws.close();
        }
      }
    }, 20000);
  }

  _resetPongTimeout() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  _stopHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this._resetPongTimeout();
    this.pingInterval = null;
  }

  _startFallbackPolling() {
    if (this.fallbackPollTimer) return;
    // When socket is disconnected, invoke reconnect listeners every 10s so UI stays fresh
    this.fallbackPollTimer = setInterval(() => {
      console.log('[WebSocket] Fallback poll triggering state refresh...');
      this.reconnectListeners.forEach((cb) => {
        try { cb(); } catch (e) { console.error('Fallback poll err:', e); }
      });
    }, 10000);
  }

  _stopFallbackPolling() {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
  }

  _clearTimers() {
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  subscribe(callback) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  onReconnect(callback) {
    this.reconnectListeners.add(callback);
    return () => this.reconnectListeners.delete(callback);
  }

  disconnect() {
    this.shouldReconnect = false;
    this._clearTimers();
    this._stopFallbackPolling();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.centerId = null;
  }
}

export const liveQueueSocket = new LiveQueueSocket();
