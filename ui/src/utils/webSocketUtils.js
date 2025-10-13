/**
 * Shared WebSocket utilities for connection management, message handling, and state synchronization
 */

// Connection status constants
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// Default configuration
export const DEFAULT_WS_CONFIG = {
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  messageRetention: 500,
  maxMessages: 1000,
  autoRequestState: true,
  enableMessageHistory: true
};

// Message types
export const MESSAGE_TYPES = {
  CONTROL: 'control',
  STATE_UPDATE: 'state_update',
  CONCEPTS_UPDATE: 'concepts_update',
  TOP_TASKS_UPDATE: 'top_tasks_update',
  REQUEST_STATE: 'request_state'
};

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
 * Creates a message handler for state synchronization
 */
export const createStateMessageHandler = (setData) => (message) => {
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
    setData(prev => ({
      ...prev,
      concepts: message.payload || []
    }));
  } else if (message.type === MESSAGE_TYPES.TOP_TASKS_UPDATE && message.payload) {
    setData(prev => ({
      ...prev,
      memoryTasks: message.payload || []
    }));
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