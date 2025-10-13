import ws from 'ws';
import { EventEmitter } from 'events';

const WebSocket = ws;

class WebSocketManager extends EventEmitter {
  constructor(url, config = {}) {
    super();
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.reconnectInterval = config.reconnectInterval || 5000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
  }

  connect() {
    if (this.isConnected) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connect');
      });

      this.ws.on('message', data => this.emit('message', data));

      this.ws.on('close', () => {
        this.isConnected = false;
        this.emit('disconnect');

        this.reconnectAttempts < this.maxReconnectAttempts && setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, this.reconnectInterval);
      });

      this.ws.on('error', error => {
        this.isConnected = false;
        this.emit('error', error);
      });
    } catch (error) {
      this.emit('error', error);
    }
  }

  send(message) {
    this.isConnected && this.ws ? this.ws.send(message) : this.emit('error', new Error('WebSocket not connected'));
  }

  disconnect() {
    this.ws?.close();
    this.isConnected = false;
  }

  getStatus() {
    return this.isConnected;
  }
}

export default WebSocketManager;