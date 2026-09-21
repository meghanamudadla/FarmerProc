class LiveQueueSocket {
  constructor() {
    this.ws = null;
    this.centerId = null;
    this.reconnectAttempts = 0;
    this.listeners = new Set();
    this.shouldReconnect = true;
  }

  connect(centerId) {
    if (this.ws && this.centerId === centerId) return; // Already connected natively
    
    this.centerId = centerId;
    this.shouldReconnect = true;
    
    // Abstracting protocol mappings intelligently dynamically 
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
    if (this.ws) {
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`Live Queue Socket directly established on internal route mapped to /center/${this.centerId}/ws!`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Broadcast raw WS streams outwards wrapping contexts beautifully
          this.listeners.forEach((cb) => cb(payload));
        } catch (err) {
          console.warn("Failed processing unmapped WS feed:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket Disconnected securely.");
        if (this.shouldReconnect) {
          // Native Fixed Backoff strategy natively looping 2.5s boundaries globally
          const delay = Math.min(2500, 1000 * Math.pow(2, this.reconnectAttempts));
          this.reconnectAttempts++;
          setTimeout(() => this._initSocket(url), delay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("LiveSocket Stream threw fatal block natively:", err);
        this.ws.close();
      };
    } catch (e) {
      console.warn("LiveSocket hook initiation blocked locally.");
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback); // Returns a clean unmount function natively
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.centerId = null;
  }
}

export const liveQueueSocket = new LiveQueueSocket();
