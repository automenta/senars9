import { EventEmitter } from 'events';

class WebSocketClient extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options
    };

    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.subscriptions = new Set();
    this.messageQueue = [];
  }

  async connect() {
    if (this.isConnected || this.ws) return;

    try {
      // Use WebSocket in browser, ws in Node.js
      let WebSocketClass;
      if (typeof window !== 'undefined') {
        WebSocketClass = WebSocket;
      } else {
        const wsModule = await import('ws');
        WebSocketClass = wsModule.default;
      }

      this.ws = new WebSocketClass(this.url);

      this.ws.onopen = () => this._handleOpen();
      this.ws.onmessage = (event) => this._handleMessage(event);
      this.ws.onclose = (event) => this._handleClose(event);
      this.ws.onerror = (error) => this._handleError(error);

    } catch (error) {
      this.emit('error', error);
    }
  }

  _handleOpen() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');

    // Send queued messages
    this.messageQueue.forEach(message => this.send(message));
    this.messageQueue = [];

    // Start heartbeat
    this._startHeartbeat();
  }

  _handleMessage(event) {
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      this.emit('message', message);

      // Handle specific message types
      if (message.type) {
        this.emit(message.type, message);
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error.message}`));
    }
  }

  _handleClose(event) {
    this.isConnected = false;
    this._stopHeartbeat();
    this.emit('disconnected', event);

    // Attempt reconnection if not intentionally closed
    if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this._scheduleReconnect();
    }
  }

  _handleError(error) {
    this.emit('error', error);
  }

  _scheduleReconnect() {
    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat' });
      }
    }, this.options.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(message) {
    if (this.isConnected && this.ws) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        this.ws.send(data);
        return true;
      } catch (error) {
        this.emit('error', error);
        return false;
      }
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
      return false;
    }
  }

  subscribe(eventType, callback) {
    this.on(eventType, callback);
    this.subscriptions.add(eventType);
  }

  unsubscribe(eventType, callback) {
    this.removeListener(eventType, callback);
    this.subscriptions.delete(eventType);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      url: this.url,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      subscriptions: Array.from(this.subscriptions)
    };
  }
}

export default WebSocketClient;