import {
  CONNECTION_STATUS,
  DEFAULT_WS_CONFIG,
  isValidWebSocketUrl,
  createConnectionManager
} from './webSocketUtils';

/**
 * Simple browser-compatible event emitter
 */
class BrowserEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
    return this;
  }

  removeAllListeners() {
    this.events = {};
  }
}

/**
 * Shared WebSocket connection manager for both backend and frontend
 * Provides consistent connection handling, reconnection logic, and event management
 */
class WebSocketConnectionManager extends BrowserEventEmitter {
  constructor(url, config = {}) {
    super();

    if (!isValidWebSocketUrl(url)) {
      throw new Error(`Invalid WebSocket URL: ${url}`);
    }

    this.url = url;
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;

    // Use the shared connection manager
    this.connectionManager = createConnectionManager();
    this.connectionManager.subscribe((status) => {
      this.emit('statusChange', status);
    });
  }

  /**
   * Establishes WebSocket connection with automatic reconnection
   */
  async connect() {
    if (this.isConnected || this.connectionManager.status === CONNECTION_STATUS.CONNECTING) {
      return;
    }

    this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      // Use native WebSocket in browser, 'ws' in Node.js
      let WebSocketClass;
      if (typeof window !== 'undefined') {
        WebSocketClass = WebSocket;
      } else {
        const wsModule = await import('ws');
        WebSocketClass = wsModule.default;
      }
      this.ws = new WebSocketClass(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTED);
        this.connectionManager.resetReconnectAttempts();
        this.emit('connect');
        this.emit('open');
      };

      this.ws.onmessage = (data) => {
        this.emit('message', data);
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
        this.emit('disconnect');
        this.emit('close', event);

        // Attempt reconnection if not manually closed
        if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
        this.emit('error', error);
      };

    } catch (error) {
      this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
      this.emit('error', error);
    }
  }

  /**
   * Schedules a reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    this.connectionManager.setStatus(CONNECTION_STATUS.RECONNECTING);
    this.connectionManager.incrementReconnectAttempts();

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Safely sends a message through the WebSocket
   */
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

  /**
   * Manually disconnects from WebSocket
   */
  disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }

    this.isConnected = false;
    this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  /**
   * Gets current connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionManager.status,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }

  /**
   * Destroys the connection manager and cleans up resources
   */
  destroy() {
    this.disconnect();
    this.events = {};
    this.connectionManager = null;
  }
}

export default WebSocketConnectionManager;