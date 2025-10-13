import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import {
  createWebSocketConfig,
  parseWebSocketMessage,
  createTask,
  sortTasksByPriority,
  manageMessageHistory,
  MESSAGE_TYPES
} from '../utils/webSocketUtils';

const useWebSocket = (url, config = {}) => {
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  const wsManagerRef = useRef(null);
  const currentUrlRef = useRef(url);
  const configRef = useRef(createWebSocketConfig(config));

  const {
    maxMessages,
    messageRetention,
    autoRequestState,
    enableMessageHistory
  } = configRef.current;

  // Initialize WebSocket manager
  useEffect(() => {
    const initializeWebSocket = async () => {
      if (!wsManagerRef.current) {
        wsManagerRef.current = new WebSocketConnectionManager(currentUrlRef.current, configRef.current);

        // Set up event listeners
        wsManagerRef.current.on('message', handleMessage);
        wsManagerRef.current.on('error', (error) => {
          setError({ message: error.message, timestamp: new Date().toISOString() });
        });
        wsManagerRef.current.on('connect', () => {
          setError(null);
          // Request initial state when connected
          if (autoRequestState) {
            setTimeout(() => {
              sendRawMessage({ type: MESSAGE_TYPES.REQUEST_STATE });
            }, 100);
          }
        });

        // Connect to WebSocket
        await wsManagerRef.current.connect();
      }
    };

    initializeWebSocket();

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.destroy();
        wsManagerRef.current = null;
      }
    };
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(async (event) => {
    setLastMessage(event);

    if (enableMessageHistory) {
      try {
        const message = await parseWebSocketMessage(event);
        setMessages(prev => [...prev, message]);
      } catch (parseError) {
        setMessages(prev => [...prev, {
          type: 'error',
          data: event.data,
          error: parseError.message
        }]);
      }
    }

    // Handle state synchronization
    try {
      const message = await parseWebSocketMessage(event);
      handleServerMessage(message);
    } catch (parseError) {
      console.error('Error parsing WebSocket message:', parseError);
    }
  }, [enableMessageHistory]);

  const handleServerMessage = useCallback((message) => {
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
  }, []);

  const sendRawMessage = useCallback((message) => {
    if (wsManagerRef.current) {
      return wsManagerRef.current.send(message);
    }
    return false;
  }, []);

  const sendMessage = useCallback((command, payload = {}) => {
    return sendRawMessage({ type: MESSAGE_TYPES.CONTROL, command, payload });
  }, [sendRawMessage]);

  const handleAddTask = useCallback((task) => {
    // Optimistically add task to local state for immediate UI feedback
    const newTask = createTask(task);

    setData(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask]
    }));

    // Send to server
    sendMessage('add_task', newTask);
  }, [sendMessage]);

  const handleUpdateTask = useCallback((task) => {
    setData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t =>
        t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t
      )
    }));
    sendMessage('update_task', task);
  }, [sendMessage]);

  const handleDeleteTask = useCallback((task) => {
    setData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== task.id)
    }));
    sendMessage('delete_task', { id: task.id });
  }, [sendMessage]);

  const requestConcepts = useCallback(() => {
    sendMessage('get_concepts');
  }, [sendMessage]);

  const requestTopTasks = useCallback(() => {
    sendMessage('get_top_tasks');
  }, [sendMessage]);

  const requestState = useCallback(() => {
    sendRawMessage({ type: 'request_state' });
  }, [sendRawMessage]);

  const disconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      setError(null);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      setTimeout(() => wsManagerRef.current.connect(), 1000);
    }
  }, []);

  // Handle URL changes
  useEffect(() => {
    currentUrlRef.current = url;

    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      setTimeout(() => wsManagerRef.current.connect(), 100);
    }
  }, [url, autoRequestState, sendRawMessage]);

  // Manage message history retention
  useEffect(() => {
    if (enableMessageHistory) {
      setMessages(prev => manageMessageHistory(prev, maxMessages, messageRetention));
    }
  }, [messages, maxMessages, messageRetention, enableMessageHistory]);

  const sortedTasks = useMemo(() =>
    sortTasksByPriority(data.tasks || []),
    [data.tasks]
  );

  // Get connection status from manager
  const connectionStatus = wsManagerRef.current?.getStatus().status || 'disconnected';
  const isConnected = wsManagerRef.current?.getStatus().isConnected || false;
  const reconnectAttempts = wsManagerRef.current?.getStatus().reconnectAttempts || 0;

  return {
    // Connection state
    isConnected,
    connectionStatus,
    error: error || (connectionStatus === 'error' ? 'WebSocket connection error' : null),

    // Message history (if enabled)
    messages: enableMessageHistory ? messages : [],
    lastMessage,

    // Application data
    tasks: sortedTasks,
    logs: data.logs || [],
    concepts: data.concepts || [],
    memoryTasks: data.memoryTasks || [], // Top tasks from Memory
    reasonerStats: data.reasonerStats || null,

    // Actions
    sendRawMessage,
    sendMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
    reconnect,
    disconnect,

    // Status
    reconnectAttempts
  };
};

export default useWebSocket;