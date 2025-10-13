import { CONNECTION_STATUS, DEFAULT_WS_CONFIG, MESSAGE_TYPES } from '../constants';

export { CONNECTION_STATUS, DEFAULT_WS_CONFIG, MESSAGE_TYPES };

// WebSocket configuration with defaults
export const createWebSocketConfig = (overrides = {}) => ({
  ...DEFAULT_WS_CONFIG,
  ...overrides
});

// Message parsing utilities
export const parseWebSocketMessage = async (event) => {
  const parseData = (data) =>
    data instanceof ArrayBuffer ? JSON.parse(new TextDecoder().decode(data)) :
    typeof data === 'string' ? JSON.parse(data) : data;

  try {
    if (event.data instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(JSON.parse(reader.result));
        reader.onerror = () => reject(new Error('Failed to read blob data'));
        reader.readAsText(event.data);
      });
    }
    return parseData(event.data);
  } catch (error) {
    throw new Error(`WebSocket message parse error: ${error.message}`);
  }
};

// Task management utilities
export const createTask = (task) => ({
  ...task,
  id: task.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  createdAt: task.createdAt || new Date().toISOString(),
  type: task.type || 'input',
  status: task.status || 'pending',
  lastModified: Date.now()
});

export const sortTasksByPriority = (tasks) =>
  [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

// Message history management
export const manageMessageHistory = (messages, maxMessages, messageRetention) =>
  messages.length > maxMessages ? messages.slice(-messageRetention) : messages;

// Connection state management
export const createConnectionManager = () => {
  let status = CONNECTION_STATUS.DISCONNECTED;
  let reconnectAttempts = 0;
  const listeners = new Set();

  return {
    get status() { return status; },
    setStatus: (newStatus) => {
      status = newStatus;
      listeners.forEach(listener => listener(status));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    incrementReconnectAttempts: () => reconnectAttempts++,
    resetReconnectAttempts: () => { reconnectAttempts = 0; },
    get reconnectAttempts() { return reconnectAttempts; }
  };
};

// URL validation
export const isValidWebSocketUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
};

// Safe message sending
export const createSafeSend = (ws, isConnected) => (message) => {
  if (ws && isConnected) {
    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  return false;
};

// State update handlers
export const createStateUpdater = (setData) => (message) => {
  const updateMap = {
    [MESSAGE_TYPES.STATE_UPDATE]: (payload) => {
      const { tasks, concepts, logs, stats } = payload;
      setData(prev => ({
        ...prev,
        tasks: tasks || prev.tasks || [],
        concepts: concepts || prev.concepts || [],
        logs: logs || prev.logs || [],
        reasonerStats: stats || prev.reasonerStats
      }));
    },
    [MESSAGE_TYPES.CONCEPTS_UPDATE]: (payload) =>
      setData(prev => ({ ...prev, concepts: payload || [] })),
    [MESSAGE_TYPES.TOP_TASKS_UPDATE]: (payload) =>
      setData(prev => ({ ...prev, memoryTasks: payload || [] }))
  };

  updateMap[message.type]?.(message.payload);
};

// Unified WebSocket manager - consolidates all functionality
export class WebSocketManager {
  constructor(options = {}) {
    this.config = createWebSocketConfig(options.config);
    this.setData = options.setData;
    this.setError = options.setError;
    this.setLastMessage = options.setLastMessage;
    this.setMessages = options.setMessages;
    this.sendMessage = options.sendMessage;
    this.sendRawMessage = options.sendRawMessage;

    this.connectionManager = createConnectionManager();
    this.taskManager = this.createTaskManager();
    this.messageHandler = this.createMessageHandler();
  }

  createTaskManager() {
    return {
      handleAddTask: (task) => {
        const newTask = createTask(task);
        this.setData?.(prev => ({
          ...prev,
          tasks: [...(prev.tasks || []), newTask]
        }));
        this.sendMessage?.('add_task', newTask);
      },

      handleUpdateTask: (task) => {
        this.setData?.(prev => ({
          ...prev,
          tasks: (prev.tasks || []).map(t =>
            t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t
          )
        }));
        this.sendMessage?.('update_task', task);
      },

      handleDeleteTask: (task) => {
        this.setData?.(prev => ({
          ...prev,
          tasks: (prev.tasks || []).filter(t => t.id !== task.id)
        }));
        this.sendMessage?.('delete_task', { id: task.id });
      },

      getSortedTasks: (tasks) => sortTasksByPriority(tasks || [])
    };
  }

  createMessageHandler() {
    return {
      handleMessage: async (event) => {
        this.setLastMessage?.(event);

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

        if (this.setData) {
          try {
            const message = await parseWebSocketMessage(event);
            this.handleStateUpdate(message);
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError);
          }
        }
      },

      handleStateUpdate: (message) => {
        createStateUpdater(this.setData)(message);
      },

      handleConnect: () => {
        this.setError?.(null);
        if (this.config.autoRequestState && this.sendRawMessage) {
          setTimeout(() => this.sendRawMessage({ type: MESSAGE_TYPES.REQUEST_STATE }), 100);
        }
      },

      handleError: (error) => {
        this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
      },

      manageMessageHistory: (messages) =>
        this.config.enableMessageHistory && messages.length > this.config.maxMessages
          ? messages.slice(-this.config.messageRetention)
          : messages
    };
  }

  // Public API
  handleMessage(event) { return this.messageHandler.handleMessage(event); }
  handleConnect() { return this.messageHandler.handleConnect(); }
  handleError(error) { return this.messageHandler.handleError(error); }
  manageMessageHistory(messages) { return this.messageHandler.manageMessageHistory(messages); }
  getSortedTasks(tasks) { return this.taskManager.getSortedTasks(tasks); }

  getTaskHandlers() {
    return {
      handleAddTask: this.taskManager.handleAddTask,
      handleUpdateTask: this.taskManager.handleUpdateTask,
      handleDeleteTask: this.taskManager.handleDeleteTask
    };
  }

  get connectionStatus() { return this.connectionManager.status; }
  get reconnectAttempts() { return this.connectionManager.reconnectAttempts; }

  subscribe(listener) { return this.connectionManager.subscribe(listener); }
  setConnectionStatus(status) { this.connectionManager.setStatus(status); }
  incrementReconnectAttempts() { this.connectionManager.incrementReconnectAttempts(); }
  resetReconnectAttempts() { this.connectionManager.resetReconnectAttempts(); }
}

// Legacy compatibility exports
export const createStateMessageHandler = createStateUpdater;
export const createTaskHandlers = (sendMessage, setData) => {
  const manager = new WebSocketManager({ sendMessage, setData });
  return manager.getTaskHandlers();
};
export const createConnectionHandlers = (wsManager, setError, autoRequestState, sendRawMessage) => ({
  onConnect: () => {
    setError(null);
    if (autoRequestState) {
      setTimeout(() => sendRawMessage({ type: MESSAGE_TYPES.REQUEST_STATE }), 100);
    }
  },
  onError: error => setError({ message: error.message, timestamp: new Date().toISOString() })
});