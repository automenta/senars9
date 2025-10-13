import { EventEmitter } from 'events';
import { isValidWebSocketUrl, DEFAULT_WS_CONFIG } from '../ui/src/utils/webSocketUtils';

// Dynamic import for Node.js WebSocket
const WebSocket = await import('ws').then(module => module.default);

class WebSocketManager extends EventEmitter {
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
  }

  connect() {
    if (this.isConnected) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connect');
        this.emit('open');
      });

      this.ws.on('message', (data) => {
        this.emit('message', data);
      });

      this.ws.on('close', (event) => {
        this.isConnected = false;
        this.emit('disconnect');
        this.emit('close', event);

        // Attempt reconnection if not manually closed
        if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        this.isConnected = false;
        this.emit('error', error);
      });
    } catch (error) {
      this.emit('error', error);
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
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

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }

    this.isConnected = false;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }

  destroy() {
    this.disconnect();
    this.removeAllListeners();
  }
}

export default WebSocketManager;