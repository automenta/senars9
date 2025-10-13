import {
  CONNECTION_STATUS,
  DEFAULT_WS_CONFIG,
  isValidWebSocketUrl,
  createConnectionManager,
  createStateUpdater
} from './webSocketUtils';

// Base connection class with common WebSocket functionality
class BaseWebSocketConnection {
  constructor(url, config = {}) {
    if (!isValidWebSocketUrl(url)) throw new Error(`Invalid WebSocket URL: ${url}`);

    this.url = url;
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;

    this.connectionManager = createConnectionManager();
    this.connectionManager.subscribe(status => this.onStatusChange(status));
  }

  onStatusChange(status) {
    // Override in subclasses for custom status handling
  }

  async connect() {
    if (this.isConnected || this.connectionManager.status === CONNECTION_STATUS.CONNECTING) return;

    this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const WebSocketClass = typeof window !== 'undefined'
        ? WebSocket
        : (await import('ws')).default;

      this.ws = new WebSocketClass(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTED);
        this.connectionManager.resetReconnectAttempts();
        this.onConnect('open');
      };

      this.ws.onmessage = data => this.onMessage(data);

      this.ws.onclose = event => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
        this.onDisconnect('close', event);

        if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = error => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
        this.onError(error);
      };

    } catch (error) {
      this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
      this.onError(error);
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    this.connectionManager.setStatus(CONNECTION_STATUS.RECONNECTING);
    this.connectionManager.incrementReconnectAttempts();

    this.reconnectTimeoutId = setTimeout(() => this.connect(), this.config.reconnectInterval);
  }

  send(message) {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.onError(error);
        return false;
      }
    }
    this.onError(new Error('WebSocket not connected'));
    return false;
  }

  disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) this.ws.close(1000, 'Manual disconnect');
    this.isConnected = false;
    this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionManager.status,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }

  destroy() {
    this.disconnect();
    this.connectionManager = null;
  }

  // Hook methods for subclasses to override
  onConnect(event) {}
  onMessage(data) {}
  onDisconnect(event, closeEvent) {}
  onError(error) {}
}

// Unified event emitter for both environments
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    (this.events[event] ||= []).push(listener);
    return this;
  }

  emit(event, ...args) {
    this.events[event]?.forEach(listener => listener(...args));
    return this;
  }

  removeAllListeners() {
    this.events = {};
  }
}

// Unified WebSocket manager for browser and Node.js
class WebSocketManager extends BaseWebSocketConnection {
  constructor(url, config = {}) {
    super(url, config);
    this.events = {};
  }

  onStatusChange(status) {
    this.emit('statusChange', status);
  }

  onConnect(event) {
    this.emit('connect', event);
  }

  onMessage(data) {
    this.emit('message', data);
  }

  onDisconnect(event, closeEvent) {
    this.emit('disconnect', event, closeEvent);
  }

  onError(error) {
    this.emit('error', error);
  }

  on(event, listener) {
    (this.events[event] ||= []).push(listener);
    return this;
  }

  emit(event, ...args) {
    this.events[event]?.forEach(listener => listener(...args));
    return this;
  }

  removeAllListeners() {
    this.events = {};
  }

  destroy() {
    this.removeAllListeners();
    super.destroy();
  }
}

// Export with both names for compatibility
const WebSocketConnectionManager = WebSocketManager;
export default WebSocketConnectionManager;