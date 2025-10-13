import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import { createWebSocketConfig, MESSAGE_TYPES, sortTasksByPriority } from '../utils/webSocketUtils';
import { useNotification } from './NotificationSystem';
import { CONNECTION_STATUS } from '../constants';

// Unified WebSocket hook with multiple modes
const useWebSocket = (url, options = {}) => {
  const {
    mode = 'standard', // 'standard', 'crdt', 'unified'
    wsConfig = {},
    enableNotifications = false
  } = options;

  const { addNotification } = useNotification();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [data, setData] = useState({});
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const wsManagerRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);

  // Standard WebSocket mode
  const initStandardWebSocket = useCallback(() => {
    const config = createWebSocketConfig(wsConfig);
    wsManagerRef.current = new WebSocketConnectionManager(url, {
      config,
      setData,
      setError,
      setLastMessage: () => {},
      setMessages,
      setConnectionStatus,
      setReconnectAttempts: () => {}
    });

    wsManagerRef.current.connect();
    return () => wsManagerRef.current?.destroy();
  }, [url, wsConfig]);

  // CRDT WebSocket mode
  const initCrdtWebSocket = useCallback(() => {
    if (!url) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(url, 'senars', ydoc);

    ydocRef.current = ydoc;
    providerRef.current = provider;

    provider.on('status', event => setConnectionStatus(event.status));

    // Yjs observers for real-time updates
    const yTasks = ydoc.getArray('tasks');
    const yLogs = ydoc.getArray('logs');
    const yConcepts = ydoc.getArray('concepts');

    const observers = {
      tasks: () => setData(prev => ({
        ...prev,
        tasks: sortTasksByPriority(yTasks.toArray().map(task =>
          task instanceof Y.Map ? task.toJSON() : task))
      })),
      logs: () => setData(prev => ({ ...prev, logs: yLogs.toArray() })),
      concepts: () => setData(prev => ({ ...prev, concepts: yConcepts.toArray() }))
    };

    Object.entries(observers).forEach(([key, observer]) =>
      ydoc.getArray(key).observe(observer));

    provider.awareness.on('change', () => {
      setData(prev => ({
        ...prev,
        reasonerStats: Array.from(provider.awareness.getStates().values())
          .find(state => state.reasonerStats)?.reasonerStats || null
      }));
    });

    return () => {
      Object.keys(observers).forEach(key =>
        ydoc.getArray(key).unobserve(observers[key]));
      provider.disconnect();
    };
  }, [url]);

  // Initialize WebSocket based on mode
  useEffect(() => {
    let cleanup;

    switch (mode) {
      case 'crdt':
        cleanup = initCrdtWebSocket();
        break;
      case 'standard':
      default:
        cleanup = initStandardWebSocket();
        break;
    }

    return cleanup;
  }, [mode, initStandardWebSocket, initCrdtWebSocket]);

  // Notification handlers
  useEffect(() => {
    if (!enableNotifications) return;

    const statusMessages = {
      [CONNECTION_STATUS.CONNECTED]: 'Connected to server',
      [CONNECTION_STATUS.DISCONNECTED]: 'Disconnected from server',
      [CONNECTION_STATUS.ERROR]: 'Connection error occurred'
    };

    if (statusMessages[connectionStatus]) {
      addNotification(statusMessages[connectionStatus], {
        [CONNECTION_STATUS.CONNECTED]: 'success',
        [CONNECTION_STATUS.DISCONNECTED]: 'error',
        [CONNECTION_STATUS.ERROR]: 'error'
      }[connectionStatus] || 'info');
    }
  }, [connectionStatus, enableNotifications, addNotification]);

  // Unified message sender
  const sendRawMessage = useCallback((message) => {
    if (mode === 'crdt' && providerRef.current?.ws?.readyState === WebSocket.OPEN) {
      providerRef.current.ws.send(JSON.stringify(message));
      return true;
    }
    return wsManagerRef.current?.send(message) || false;
  }, [mode]);

  const sendMessage = useCallback((command, payload = {}) => {
    const message = { type: MESSAGE_TYPES.CONTROL, command, payload };
    return sendRawMessage(message);
  }, [sendRawMessage]);

  // Task handlers
  const handleAddTask = useCallback((task) => sendMessage('add_task', task), [sendMessage]);
  const handleUpdateTask = useCallback((task) => sendMessage('update_task', task), [sendMessage]);
  const handleDeleteTask = useCallback((task) => sendMessage('delete_task', { id: task.id }), [sendMessage]);

  // Request handlers
  const requestConcepts = useCallback(() => sendMessage('get_concepts'), [sendMessage]);
  const requestTopTasks = useCallback(() => sendMessage('get_top_tasks'), [sendMessage]);
  const requestState = useCallback(() => sendRawMessage({ type: 'request_state' }), [sendRawMessage]);

  // Connection management
  const disconnect = useCallback(() => {
    if (mode === 'crdt') {
      providerRef.current?.disconnect();
    } else {
      wsManagerRef.current?.disconnect();
    }
    setError(null);
  }, [mode]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      if (mode === 'crdt') {
        initCrdtWebSocket();
      } else {
        initStandardWebSocket();
      }
    }, 1000);
  }, [mode, disconnect, initCrdtWebSocket, initStandardWebSocket]);

  return {
    // Connection state
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,

    // Data
    messages: wsConfig.enableMessageHistory ? messages : [],
    tasks: data.tasks || [],
    logs: data.logs || [],
    concepts: data.concepts || [],
    memoryTasks: data.memoryTasks || [],
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
    disconnect
  };
};

export default useWebSocket;