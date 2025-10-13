import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import {
  createWebSocketConfig,
  MESSAGE_TYPES,
  BaseWebSocketHook
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

        const baseHook = new BaseWebSocketHook({
          setData,
          setError,
          setLastMessage,
          setMessages,
          sendMessage,
          sendRawMessage,
          config: {
            enableMessageHistory,
            maxMessages,
            messageRetention,
            autoRequestState
          }
        });

        wsManagerRef.current
          .on('message', event => baseHook.handleMessage(event))
          .on('error', error => baseHook.handleError(error))
          .on('connect', () => baseHook.handleConnect());

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

  const sendRawMessage = useCallback((message) => {
    return wsManagerRef.current?.send(message) || false;
  }, []);

  const sendMessage = useCallback((command, payload = {}) => {
    return sendRawMessage({ type: MESSAGE_TYPES.CONTROL, command, payload });
  }, [sendRawMessage]);

  const baseHook = useMemo(() =>
    new BaseWebSocketHook({
      setData,
      setError,
      setLastMessage,
      setMessages,
      sendMessage,
      sendRawMessage,
      config: {
        enableMessageHistory,
        maxMessages,
        messageRetention,
        autoRequestState
      }
    }),
    [setData, setError, setLastMessage, setMessages, sendMessage, sendRawMessage, enableMessageHistory, maxMessages, messageRetention, autoRequestState]
  );

  const taskHandlers = useMemo(() => baseHook.getTaskHandlers(), [baseHook]);

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

  // Handle URL changes
  useEffect(() => {
    currentUrlRef.current = url;
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
      setTimeout(() => wsManagerRef.current?.connect(), 100);
    }
  }, [url]);

  // Manage message history retention
  useEffect(() => {
    if (enableMessageHistory) {
      setMessages(prev => baseHook.manageMessageHistory(prev));
    }
  }, [messages, baseHook, enableMessageHistory]);

   const sortedTasks = useMemo(() =>
     baseHook.getSortedTasks(data.tasks || []),
     [data.tasks, baseHook]
   );

  const status = wsManagerRef.current?.getStatus();
  const connectionStatus = status?.status || 'disconnected';

  return {
    // Connection state
    isConnected: status?.isConnected || false,
    connectionStatus,
    error: error || (connectionStatus === 'error' ? 'WebSocket connection error' : null),

    // Message history (if enabled)
    messages: enableMessageHistory ? messages : [],
    lastMessage,

    // Application data
    tasks: sortedTasks,
    logs: data.logs || [],
    concepts: data.concepts || [],
    memoryTasks: data.memoryTasks || [],
    reasonerStats: data.reasonerStats || null,

    // Actions
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

    // Status
    reconnectAttempts: status?.reconnectAttempts || 0
  };
};

export default useWebSocket;