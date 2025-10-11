const WebSocket = require('ws'); // Using 'ws' package for Node.js WebSocket implementation
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.reconnectInterval = 5000; // 5 seconds
    this.maxReconnectAttempts = 10;
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
        console.log(`Connected to ${this.url}`);
      });

      this.ws.on('message', (data) => {
        this.emit('message', data);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.emit('disconnect');
        console.log(`Disconnected from ${this.url}`);

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, this.reconnectInterval);
        }
      });

      this.ws.on('error', (error) => {
        console.error(`WebSocket error for ${this.url}:`, error);
        this.isConnected = false;
        this.emit('error', error);
      });
    } catch (error) {
      console.error(`Failed to connect to ${this.url}:`, error);
      this.emit('error', error);
    }
  }

  send(message) {
    if (this.isConnected && this.ws) {
      this.ws.send(message);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }

  getStatus() {
    return this.isConnected;
  }
}

module.exports = WebSocketManager;