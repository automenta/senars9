import {
  CONNECTION_STATUS,
  DEFAULT_WS_CONFIG,
  MESSAGE_TYPES,
  isValidWebSocketUrl,
  createConnectionManager
} from './webSocketUtils';
import TaskManager from './TaskManager';
import MessageHandler from './MessageHandler';
import StateManager from './StateManager';

class WebSocketConnectionManager {
  constructor(url, options = {}) {
    if (!isValidWebSocketUrl(url)) throw new Error(`Invalid WebSocket URL: ${url}`);

    const { config = {}, setData, setError, setLastMessage, setMessages } = options;

    this.url = url;
    this.config = { ...DEFAULT_WS_CONFIG, ...config };
    this.setData = setData;
    this.setError = setError;
    this.setLastMessage = setLastMessage;
    this.setMessages = setMessages;

    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeoutId = null;
    this.events = {};

    this.connectionManager = createConnectionManager();
    this.connectionManager.subscribe(status => this.emit('statusChange', status));

    // Initialize modular components
    this.taskManager = new TaskManager(setData, (type, command, payload) =>
      this.send({ type, command, payload }));
    this.messageHandler = new MessageHandler(setData, setError, setLastMessage, setMessages, config);
    this.stateManager = new StateManager(setData, setError, setLastMessage, setMessages, config, (message) => this.send(message));
  }

  async connect() {
    if (this.isConnected || this.connectionManager?.status === CONNECTION_STATUS.CONNECTING) return;

    this.connectionManager?.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const WebSocketClass = typeof window !== 'undefined' ? WebSocket : (await import('ws')).default;
      this.ws = new WebSocketClass(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionManager?.setStatus(CONNECTION_STATUS.CONNECTED);
        this.connectionManager?.resetReconnectAttempts();
        this.emit('connect');
        this.messageHandler.handleConnect();
      };

      this.ws.onmessage = event => {
        this.emit('message', event);
        this.messageHandler.handleMessage(event);
      };

      this.ws.onclose = event => {
        this.isConnected = false;
        this.connectionManager?.setStatus(CONNECTION_STATUS.DISCONNECTED);
        this.emit('disconnect', event);

        (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) &&
          this.scheduleReconnect();
      };

      this.ws.onerror = error => {
        this.isConnected = false;
        this.connectionManager?.setStatus(CONNECTION_STATUS.ERROR);
        this.emit('error', error);
        this.messageHandler.handleError(error);
      };

    } catch (error) {
      this.connectionManager?.setStatus(CONNECTION_STATUS.ERROR);
      this.emit('error', error);
      this.messageHandler.handleError(error);
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    this.connectionManager?.setStatus(CONNECTION_STATUS.RECONNECTING);
    this.connectionManager?.incrementReconnectAttempts();

    this.reconnectTimeoutId = setTimeout(() => this.connect(), this.config.reconnectInterval);
  }

  manageMessageHistory(messages) {
    return this.stateManager.manageMessageHistory(messages);
  }

  send(message) {
    return this.isConnected && this.ws ?
      (() => { try { this.ws.send(JSON.stringify(message)); return true; } catch (error) { this.emit('error', error); return false; } })() :
      (this.emit('error', new Error('WebSocket not connected')), false);
  }

  disconnect() {
    this.reconnectTimeoutId && (clearTimeout(this.reconnectTimeoutId), this.reconnectTimeoutId = null);
    this.ws?.close(1000, 'Manual disconnect');
    this.isConnected = false;
    this.connectionManager?.setStatus(CONNECTION_STATUS.DISCONNECTED);
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionManager?.status,
      reconnectAttempts: this.reconnectAttempts,
      url: this.url
    };
  }

  getTaskHandlers() {
    return {
      handleAddTask: this.taskManager.handleAddTask.bind(this.taskManager),
      handleUpdateTask: this.taskManager.handleUpdateTask.bind(this.taskManager),
      handleDeleteTask: this.taskManager.handleDeleteTask.bind(this.taskManager)
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
    this.taskManager = null;
    this.messageHandler = null;
    this.stateManager = null;
  }
}

export default WebSocketConnectionManager;