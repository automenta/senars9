/**
 * Shared WebSocket utilities for connection management, message handling, and state synchronization
 */

// Import and re-export consolidated constants from main constants file
import { CONNECTION_STATUS, DEFAULT_WS_CONFIG, MESSAGE_TYPES } from '../constants';

export { CONNECTION_STATUS, DEFAULT_WS_CONFIG, MESSAGE_TYPES };

/**
 * Creates a standardized WebSocket configuration object
 */
export const createWebSocketConfig = (overrides = {}) => ({
  ...DEFAULT_WS_CONFIG,
  ...overrides
});

/**
 * Parses WebSocket message data, handling different formats (JSON, Blob, ArrayBuffer)
 */
export const parseWebSocketMessage = (event) => {
  try {
    if (event.data instanceof Blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const message = JSON.parse(reader.result);
            resolve(message);
          } catch (parseError) {
            reject(new Error(`Failed to parse blob message: ${parseError.message}`));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read blob data'));
        reader.readAsText(event.data);
      });
    }

    if (event.data instanceof ArrayBuffer) {
      return JSON.parse(new TextDecoder().decode(event.data));
    }

    return typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  } catch (error) {
    throw new Error(`WebSocket message parse error: ${error.message}`);
  }
};


/**
 * Creates a standardized task object with defaults
 */
export const createTask = (task) => ({
  ...task,
  id: task.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  createdAt: task.createdAt || new Date().toISOString(),
  type: task.type || 'input',
  status: task.status || 'pending',
  lastModified: Date.now()
});

/**
 * Sorts tasks by priority (highest first)
 */
export const sortTasksByPriority = (tasks) =>
  [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

/**
 * Manages message history with retention limits
 */
export const manageMessageHistory = (messages, maxMessages, messageRetention) => {
  if (messages.length > maxMessages) {
    return messages.slice(-messageRetention);
  }
  return messages;
};

/**
 * Creates a connection status manager for WebSocket state tracking
 */
export const createConnectionManager = () => {
  let status = CONNECTION_STATUS.DISCONNECTED;
  let reconnectAttempts = 0;
  const listeners = new Set();

  const setStatus = (newStatus) => {
    status = newStatus;
    listeners.forEach(listener => listener(status));
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    get status() { return status; },
    setStatus,
    subscribe,
    incrementReconnectAttempts: () => reconnectAttempts++,
    resetReconnectAttempts: () => { reconnectAttempts = 0; },
    get reconnectAttempts() { return reconnectAttempts; }
  };
};

/**
 * Validates WebSocket URL format
 */
export const isValidWebSocketUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
};

/**
 * Creates a safe send function that checks connection state
 */
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

/**
 * Creates standardized state updater for WebSocket messages
 */
export const createStateUpdater = (setData) => (message) => {
  if (message.type === MESSAGE_TYPES.STATE_UPDATE && message.payload) {
    const { tasks, concepts, logs, stats } = message.payload;
    setData(prev => ({
      ...prev,
      tasks: tasks || prev.tasks || [],
      concepts: concepts || prev.concepts || [],
      logs: logs || prev.logs || [],
      reasonerStats: stats || prev.reasonerStats
    }));
  } else if (message.type === MESSAGE_TYPES.CONCEPTS_UPDATE && message.payload) {
    setData(prev => ({ ...prev, concepts: message.payload || [] }));
  } else if (message.type === MESSAGE_TYPES.TOP_TASKS_UPDATE && message.payload) {
    setData(prev => ({ ...prev, memoryTasks: message.payload || [] }));
  }
};

// Alias for backward compatibility
export const createStateMessageHandler = createStateUpdater;

/**
 * Unified task management system for WebSocket connections
 */
export class WebSocketTaskManager {
  constructor(options = {}) {
    this.sendMessage = options.sendMessage;
    this.setData = options.setData;
    this.sortTasksByPriority = options.sortTasksByPriority || ((tasks) => [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0)));
  }

  handleAddTask(task) {
    const newTask = createTask(task);
    this.setData?.(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask]
    }));
    this.sendMessage?.('add_task', newTask);
  }

  handleUpdateTask(task) {
    this.setData?.(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t =>
        t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t
      )
    }));
    this.sendMessage?.('update_task', task);
  }

  handleDeleteTask(task) {
    this.setData?.(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== task.id)
    }));
    this.sendMessage?.('delete_task', { id: task.id });
  }

  getSortedTasks(tasks) {
    return this.sortTasksByPriority(tasks || []);
  }
}

/**
 * Creates task management handlers (legacy compatibility)
 */
export const createTaskHandlers = (sendMessage, setData) => {
  const taskManager = new WebSocketTaskManager({ sendMessage, setData });
  return {
    handleAddTask: task => taskManager.handleAddTask(task),
    handleUpdateTask: task => taskManager.handleUpdateTask(task),
    handleDeleteTask: task => taskManager.handleDeleteTask(task)
  };
};

/**
 * Unified message handler for WebSocket connections
 */
export class WebSocketMessageHandler {
  constructor(options = {}) {
    this.setData = options.setData;
    this.setError = options.setError;
    this.setLastMessage = options.setLastMessage;
    this.setMessages = options.setMessages;
    this.enableMessageHistory = options.enableMessageHistory || false;
    this.maxMessages = options.maxMessages || 1000;
    this.messageRetention = options.messageRetention || 500;
    this.autoRequestState = options.autoRequestState || true;
    this.sendRawMessage = options.sendRawMessage;
  }

  async handleMessage(event) {
    // Update last message
    this.setLastMessage?.(event);

    // Handle message history if enabled
    if (this.enableMessageHistory && this.setMessages) {
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

    // Handle state synchronization
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
    if (message.type === MESSAGE_TYPES.STATE_UPDATE && message.payload) {
      const { tasks, concepts, logs, stats } = message.payload;
      this.setData(prev => ({
        ...prev,
        tasks: tasks || prev.tasks || [],
        concepts: concepts || prev.concepts || [],
        logs: logs || prev.logs || [],
        reasonerStats: stats || prev.reasonerStats
      }));
    } else if (message.type === MESSAGE_TYPES.CONCEPTS_UPDATE && message.payload) {
      this.setData(prev => ({ ...prev, concepts: message.payload || [] }));
    } else if (message.type === MESSAGE_TYPES.TOP_TASKS_UPDATE && message.payload) {
      this.setData(prev => ({ ...prev, memoryTasks: message.payload || [] }));
    }
  }

  handleConnect() {
    this.setError?.(null);
    if (this.autoRequestState && this.sendRawMessage) {
      setTimeout(() => this.sendRawMessage({ type: MESSAGE_TYPES.REQUEST_STATE }), 100);
    }
  }

  handleError(error) {
    this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
  }

  manageMessageHistory(messages) {
    if (this.enableMessageHistory && messages.length > this.maxMessages) {
      return messages.slice(-this.messageRetention);
    }
    return messages;
  }
}

/**
 * Base WebSocket hook with common functionality
 */
export class BaseWebSocketHook {
  constructor(options = {}) {
    this.setData = options.setData;
    this.setError = options.setError;
    this.setLastMessage = options.setLastMessage;
    this.setMessages = options.setMessages;
    this.sendMessage = options.sendMessage;
    this.sendRawMessage = options.sendRawMessage;

    this.config = {
      enableMessageHistory: options.enableMessageHistory || false,
      maxMessages: options.maxMessages || 1000,
      messageRetention: options.messageRetention || 500,
      autoRequestState: options.autoRequestState || true,
      ...options.config
    };

    this.messageHandler = new WebSocketMessageHandler({
      setData: this.setData,
      setError: this.setError,
      setLastMessage: this.setLastMessage,
      setMessages: this.setMessages,
      enableMessageHistory: this.config.enableMessageHistory,
      maxMessages: this.config.maxMessages,
      messageRetention: this.config.messageRetention,
      autoRequestState: this.config.autoRequestState,
      sendRawMessage: this.sendRawMessage
    });

    this.taskManager = new WebSocketTaskManager({
      sendMessage: this.sendMessage,
      setData: this.setData
    });
  }

  handleMessage(event) {
    return this.messageHandler.handleMessage(event);
  }

  handleConnect() {
    return this.messageHandler.handleConnect();
  }

  handleError(error) {
    return this.messageHandler.handleError(error);
  }

  manageMessageHistory(messages) {
    return this.messageHandler.manageMessageHistory(messages);
  }

  getSortedTasks(tasks) {
    return this.taskManager.getSortedTasks(tasks);
  }

  getTaskHandlers() {
    return {
      handleAddTask: task => this.taskManager.handleAddTask(task),
      handleUpdateTask: task => this.taskManager.handleUpdateTask(task),
      handleDeleteTask: task => this.taskManager.handleDeleteTask(task)
    };
  }
}

/**
 * Creates connection management handlers (legacy compatibility)
 */
export const createConnectionHandlers = (wsManager, setError, autoRequestState, sendRawMessage) => ({
  onConnect: () => {
    setError(null);
    if (autoRequestState) {
      setTimeout(() => sendRawMessage({ type: MESSAGE_TYPES.REQUEST_STATE }), 100);
    }
  },

  onError: error => {
    setError({ message: error.message, timestamp: new Date().toISOString() });
  }
});