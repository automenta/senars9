import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import { createWebSocketConfig, MESSAGE_TYPES, WebSocketManager } from '../utils/webSocketUtils';

const useWebSocket = (url, config = {}) => {
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [data, setData] = useState({});

  const wsManagerRef = useRef(null);
  const wsUtilsRef = useRef(null);
  const configRef = useRef(createWebSocketConfig(config));

  const {
    maxMessages,
    messageRetention,
    autoRequestState,
    enableMessageHistory
  } = configRef.current;

  // Initialize WebSocket connection
  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new WebSocketConnectionManager(url, configRef.current);
      wsUtilsRef.current = new WebSocketManager({
        setData,
        setError,
        setLastMessage,
        setMessages,
        sendMessage,
        sendRawMessage,
        config: configRef.current
      });

      wsManagerRef.current
        .on('message', event => wsUtilsRef.current.handleMessage(event))
        .on('error', error => wsUtilsRef.current.handleError(error))
        .on('connect', () => wsUtilsRef.current.handleConnect());

      wsManagerRef.current.connect();
    }

    return () => {
      wsManagerRef.current?.destroy();
      wsManagerRef.current = null;
      wsUtilsRef.current = null;
    };
  }, []);

  // Handle URL changes
  useEffect(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      setTimeout(() => wsManagerRef.current?.connect(), 100);
    }
  }, [url]);

  const sendRawMessage = useCallback((message) =>
    wsManagerRef.current?.send(message) || false, []);

  const sendMessage = useCallback((command, payload = {}) =>
    sendRawMessage({ type: MESSAGE_TYPES.CONTROL, command, payload }), [sendRawMessage]);

  const taskHandlers = useMemo(() => wsUtilsRef.current?.getTaskHandlers() || {}, []);

  const requestConcepts = useCallback(() => sendMessage('get_concepts'), [sendMessage]);
  const requestTopTasks = useCallback(() => sendMessage('get_top_tasks'), [sendMessage]);
  const requestState = useCallback(() => sendRawMessage({ type: 'request_state' }), [sendRawMessage]);

  const disconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
    setError(null);
  }, []);

  const reconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
    setTimeout(() => wsManagerRef.current?.connect(), 1000);
  }, []);

  // Manage message history retention
  useEffect(() => {
    if (enableMessageHistory && wsUtilsRef.current) {
      setMessages(prev => wsUtilsRef.current.manageMessageHistory(prev));
    }
  }, [messages, enableMessageHistory]);

  const sortedTasks = useMemo(() =>
    wsUtilsRef.current?.getSortedTasks(data.tasks || []) || [],
    [data.tasks]);

  const status = wsManagerRef.current?.getStatus();
  const connectionStatus = status?.status || 'disconnected';

  return {
    isConnected: status?.isConnected || false,
    connectionStatus,
    error: error || (connectionStatus === 'error' ? 'WebSocket connection error' : null),
    messages: enableMessageHistory ? messages : [],
    lastMessage,
    tasks: sortedTasks,
    logs: data.logs || [],
    concepts: data.concepts || [],
    memoryTasks: data.memoryTasks || [],
    reasonerStats: data.reasonerStats || null,
    sendRawMessage,
    sendMessage,
    handleAddTask: taskHandlers.handleAddTask,
    handleUpdateTask: taskHandlers.handleUpdateTask,
    handleDeleteTask: taskHandlers.handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
    reconnect,
    disconnect,
    reconnectAttempts: status?.reconnectAttempts || 0
  };
};

export default useWebSocket;