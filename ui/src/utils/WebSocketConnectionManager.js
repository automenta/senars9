import {
  CONNECTION_STATUS,
  DEFAULT_WS_CONFIG,
  MESSAGE_TYPES,
  isValidWebSocketUrl,
  createConnectionManager,
  parseWebSocketMessage,
  createTask,
  sortTasksByPriority,
  createStateUpdater
} from './webSocketUtils';

// Unified WebSocket manager - handles both connection and state management
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
  }

  async connect() {
    if (this.isConnected || this.connectionManager.status === CONNECTION_STATUS.CONNECTING) return;

    this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      const WebSocketClass = typeof window !== 'undefined' ? WebSocket : (await import('ws')).default;
      this.ws = new WebSocketClass(this.url);

      // Consolidated event handlers - optimized
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionManager.setStatus(CONNECTION_STATUS.CONNECTED);
        this.connectionManager.resetReconnectAttempts();
        this.emit('connect');
        this.handleConnect();
      };

      this.ws.onmessage = event => {
        this.emit('message', event);
        this.handleMessage(event);
      };

      this.ws.onclose = event => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.DISCONNECTED);
        this.emit('disconnect', event);

        // Optimized reconnection logic
        const shouldReconnect = !event.wasClean &&
          this.reconnectAttempts < this.config.maxReconnectAttempts;

        shouldReconnect && this.scheduleReconnect();
      };

      this.ws.onerror = error => {
        this.isConnected = false;
        this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
        this.emit('error', error);
        this.handleError(error);
      };

    } catch (error) {
      this.connectionManager.setStatus(CONNECTION_STATUS.ERROR);
      this.emit('error', error);
      this.handleError(error);
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    this.connectionManager.setStatus(CONNECTION_STATUS.RECONNECTING);
    this.connectionManager.incrementReconnectAttempts();

    this.reconnectTimeoutId = setTimeout(() => this.connect(), this.config.reconnectInterval);
  }

  // Higher-level message and state management - optimized
  async handleMessage(event) {
    this.setLastMessage?.(event);

    // Handle message history
    if (this.config.enableMessageHistory && this.setMessages) {
      try {
        const message = await parseWebSocketMessage(event);
        this.setMessages(prev => [...prev, message]);
      } catch (parseError) {
        this.setMessages?.(prev => [...prev, {
          type: 'error',
          data: event.data,
          error: parseError.message
        }]);
      }
    }

    // Handle state updates
    if (this.setData) {
      try {
        const message = await parseWebSocketMessage(event);
        this.handleStateUpdate(message);
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
      }
    }
  }

  handleStateUpdate(message) {
    createStateUpdater(this.setData)(message);
  }

  handleConnect() {
    this.setError?.(null);
    if (this.config.autoRequestState) {
      setTimeout(() => this.send({ type: MESSAGE_TYPES.REQUEST_STATE }), 100);
    }
  }

  handleError(error) {
    this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
  }

  // Task management - terse syntax
  handleAddTask(task) {
    const newTask = createTask(task);
    this.setData?.(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask]
    }));
    this.send({ type: MESSAGE_TYPES.CONTROL, command: 'add_task', payload: newTask });
  }

  handleUpdateTask(task) {
    this.setData?.(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t =>
        t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t
      )
    }));
    this.send({ type: MESSAGE_TYPES.CONTROL, command: 'update_task', payload: task });
  }

  handleDeleteTask(task) {
    this.setData?.(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== task.id)
    }));
    this.send({ type: MESSAGE_TYPES.CONTROL, command: 'delete_task', payload: { id: task.id } });
  }

  getSortedTasks(tasks) {
    return sortTasksByPriority(tasks || []);
  }

  manageMessageHistory(messages) {
    return this.config.enableMessageHistory && messages.length > this.config.maxMessages
      ? messages.slice(-this.config.messageRetention)
      : messages;
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
    // Clear reconnection timer
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Close WebSocket connection
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

  getTaskHandlers() {
    return {
      handleAddTask: this.handleAddTask.bind(this),
      handleUpdateTask: this.handleUpdateTask.bind(this),
      handleDeleteTask: this.handleDeleteTask.bind(this)
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