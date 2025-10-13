import { CONNECTION_STATUS, WS_CONFIG, MESSAGE_TYPES } from '../constants';

export { CONNECTION_STATUS, WS_CONFIG, MESSAGE_TYPES };

// WebSocket configuration
export const createWebSocketConfig = (overrides = {}) => ({
  ...WS_CONFIG,
  ...overrides
});

export const parseWebSocketMessage = async (event) => {
  const parseData = (data) =>
    data instanceof ArrayBuffer ? JSON.parse(new TextDecoder().decode(data)) :
    typeof data === 'string' ? JSON.parse(data) : data;

  try {
    return event.data instanceof Blob ?
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(JSON.parse(reader.result));
        reader.onerror = () => reject(new Error('Failed to read blob data'));
        reader.readAsText(event.data);
      }) :
      parseData(event.data);
  } catch (error) {
    throw new Error(`WebSocket message parse error: ${error.message}`);
  }
};

// Task management utilities
// Task utilities
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
  return ws && isConnected ?
    (() => { try { ws.send(JSON.stringify(message)); return true; } catch (error) { console.error('Error sending WebSocket message:', error); return false; } })() :
    false;
};

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

// WebSocket hook abstraction
export const createWebSocketHook = (WebSocketClass, config = {}) => {
  const {
    onMessage,
    onConnect,
    onError,
    onDisconnect,
    setData,
    setError,
    setLastMessage,
    setMessages,
    enableMessageHistory = false,
    maxMessages = 1000,
    messageRetention = 500
  } = config;

  return {
    handleMessage: (event) => {
      setLastMessage?.(event);
      onMessage?.(event);

      if (enableMessageHistory && setMessages) {
        try {
          const message = parseWebSocketMessage(event);
          setMessages(prev => manageMessageHistory([...prev, message], maxMessages, messageRetention));
        } catch (parseError) {
          setMessages?.(prev => [...prev, {
            type: 'error',
            data: event.data,
            error: parseError.message
          }]);
        }
      }

      if (setData) {
        try {
          const message = parseWebSocketMessage(event);
          createStateUpdater(setData)(message);
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      }
    },

    handleConnect: () => {
      setError?.(null);
      onConnect?.();
    },

    handleError: (error) => {
      setError?.({ message: error.message, timestamp: new Date().toISOString() });
      onError?.(error);
    },

    handleDisconnect: (event) => {
      onDisconnect?.(event);
    }
  };
};

// Message history management
export const manageMessageHistory = (messages, maxMessages, messageRetention) =>
  messages.length > maxMessages ? messages.slice(-messageRetention) : messages;

// Legacy compatibility
export const createStateMessageHandler = createStateUpdater;