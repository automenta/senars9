import { useEffect, useState, useCallback, useRef, useMemo, useReducer } from 'react';
import WebSocketConnectionManager from '../utils/WebSocketConnectionManager';
import { createWebSocketConfig, MESSAGE_TYPES } from '../utils/webSocketUtils';

// State reducer for better state management
const initialState = {
  messages: [],
  lastMessage: null,
  error: null,
  data: {},
  connectionStatus: 'disconnected',
  reconnectAttempts: 0
};

const wsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MESSAGES': return { ...state, messages: action.payload };
    case 'SET_MESSAGE': return { ...state, lastMessage: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_DATA': return { ...state, data: action.payload };
    case 'SET_CONNECTION_STATUS': return { ...state, connectionStatus: action.payload };
    case 'SET_RECONNECT_ATTEMPTS': return { ...state, reconnectAttempts: action.payload };
    case 'RESET_ERROR': return { ...state, error: null };
    default: return state;
  }
};

const useWebSocket = (url, config = {}) => {
  const [state, dispatch] = useReducer(wsReducer, initialState);
  const wsManagerRef = useRef(null);
  const configRef = useRef(createWebSocketConfig(config));
  const reconnectTimeoutRef = useRef(null);

  // Memoized callbacks to prevent unnecessary re-renders
  const setData = useCallback((data) => dispatch({ type: 'SET_DATA', payload: data }), []);
  const setError = useCallback((error) => dispatch({ type: 'SET_ERROR', payload: error }), []);
  const setLastMessage = useCallback((message) => dispatch({ type: 'SET_MESSAGE', payload: message }), []);
  const setMessages = useCallback((messages) => dispatch({ type: 'SET_MESSAGES', payload: messages }), []);

  // Initialize WebSocket manager
  useEffect(() => {
    wsManagerRef.current = new WebSocketConnectionManager(url, {
      config: configRef.current,
      setData,
      setError,
      setLastMessage,
      setMessages,
      setConnectionStatus: (status) => dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }),
      setReconnectAttempts: (attempts) => dispatch({ type: 'SET_RECONNECT_ATTEMPTS', payload: attempts })
    });

    wsManagerRef.current.connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsManagerRef.current?.destroy();
      wsManagerRef.current = null;
    };
  }, []);

  // Handle URL changes
  useEffect(() => {
    if (!wsManagerRef.current) return;

    wsManagerRef.current.disconnect();
    reconnectTimeoutRef.current = setTimeout(() => {
      wsManagerRef.current?.connect();
    }, 100);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url]);

  // Message history management
  useEffect(() => {
    if (configRef.current.enableMessageHistory && wsManagerRef.current) {
      const managedMessages = wsManagerRef.current.manageMessageHistory(state.messages);
      if (managedMessages !== state.messages) {
        dispatch({ type: 'SET_MESSAGES', payload: managedMessages });
      }
    }
  }, [state.messages]);

  // Memoized handlers
  const sendRawMessage = useCallback((message) =>
    wsManagerRef.current?.send(message) || false, []);

  const sendMessage = useCallback((command, payload = {}) =>
    sendRawMessage({ type: MESSAGE_TYPES.CONTROL, command, payload }), [sendRawMessage]);

  const taskHandlers = useMemo(() =>
    wsManagerRef.current?.getTaskHandlers() || {
      handleAddTask: () => {},
      handleUpdateTask: () => {},
      handleDeleteTask: () => {}
    }, [state.data.tasks]);

  // Request handlers
  const requestConcepts = useCallback(() => sendMessage('get_concepts'), [sendMessage]);
  const requestTopTasks = useCallback(() => sendMessage('get_top_tasks'), [sendMessage]);
  const requestState = useCallback(() => sendRawMessage({ type: 'request_state' }), [sendRawMessage]);

  // Connection management
  const disconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
    dispatch({ type: 'RESET_ERROR' });
  }, []);

  const reconnect = useCallback(() => {
    wsManagerRef.current?.disconnect();
    reconnectTimeoutRef.current = setTimeout(() => {
      wsManagerRef.current?.connect();
    }, 1000);
  }, []);

  // Memoized derived state
  const sortedTasks = useMemo(() =>
    wsManagerRef.current?.getSortedTasks(state.data.tasks || []) || [],
    [state.data.tasks]);

  const error = state.error || (state.connectionStatus === 'error' ? 'WebSocket connection error' : null);

  return {
    isConnected: state.connectionStatus === 'connected',
    connectionStatus: state.connectionStatus,
    error,
    messages: configRef.current.enableMessageHistory ? state.messages : [],
    lastMessage: state.lastMessage,
    tasks: sortedTasks,
    logs: state.data.logs || [],
    concepts: state.data.concepts || [],
    memoryTasks: state.data.memoryTasks || [],
    reasonerStats: state.data.reasonerStats || null,
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
    reconnectAttempts: state.reconnectAttempts
  };
};

export default useWebSocket;