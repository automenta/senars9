import {
  CONNECTION_STATUS,
  DEFAULT_WS_CONFIG,
  isValidWebSocketUrl,
  createConnectionManager
} from './webSocketUtils';

// WebSocket connection manager - simplified and consolidated
class WebSocketConnectionManager {
  constructor(url, config = {}) {
    if (!isValidWebSocketUrl(url)) throw new Error(`Invalid WebSocket URL: ${url}`);

    this.url = url;
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;
    this.events = {};

    this.connectionManager = createConnectionManager();
    this.connectionManager.subscribe(status => this.emit('statusChange', status));
  }

  async connect() {
    if (this.isConnected || this.connectionManager.status === CONNECTION_STATUS.CONNECTING) return;

    this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const WebSocketClass = typeof window !== 'undefined' ? WebSocket : (await import('ws')).default;
      this.ws = new WebSocketClass(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTED);
        this.connectionManager.resetReconnectAttempts();
        this.emit('connect');
      };

      this.ws.onmessage = data => this.emit('message', data);

      this.ws.onclose = event => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
        this.emit('disconnect', event);

        !event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts && this.scheduleReconnect();
      };

      this.ws.onerror = error => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
        this.emit('error', error);
      };

    } catch (error) {
      this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
      this.emit('error', error);
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
        this.emit('error', error);
        return false;
      }
    }
    this.emit('error', new Error('WebSocket not connected'));
    return false;
  }

  disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.ws?.close(1000, 'Manual disconnect');
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
    this.disconnect();
    this.connectionManager = null;
  }
}

export default WebSocketConnectionManager;