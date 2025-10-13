import { useMemo, useCallback } from 'react';
import useWebSocket from './useWebSocket';
import useCrdtWebSocket from './crdtWebSocket';
import { MESSAGE_TYPES } from '../constants';

const useUnifiedWebSocket = (url, options = {}) => {
  const {
    useCRDT = false,
    wsConfig = {},
    crdtConfig = {}
  } = options;

  const wsHook = useWebSocket(url, wsConfig);
  const crdtHook = useCrdtWebSocket(url, crdtConfig);

  const activeHook = useMemo(() =>
    useCRDT ? crdtHook : wsHook,
    [useCRDT, crdtHook, wsHook]
  );

  const unifiedSendMessage = useCallback((command, payload = {}) => {
    const message = { type: MESSAGE_TYPES.CONTROL, command, payload };
    return useCRDT ?
      crdtHook.sendRawMessage(message) :
      wsHook.sendRawMessage(message);
  }, [useCRDT, crdtHook, wsHook]);

  const unifiedTaskHandlers = useMemo(() => ({
    handleAddTask: (task) => {
      useCRDT ?
        crdtHook.handleAddTask(task) :
        wsHook.handleAddTask(task);
    },
    handleUpdateTask: (task) => {
      useCRDT ?
        crdtHook.handleUpdateTask(task) :
        wsHook.handleUpdateTask(task);
    },
    handleDeleteTask: (task) => {
      useCRDT ?
        crdtHook.handleDeleteTask(task) :
        wsHook.handleDeleteTask(task);
    }
  }), [useCRDT, crdtHook, wsHook]);

  return {
    // Connection state
    isConnected: activeHook.isConnected,
    connectionStatus: activeHook.connectionStatus,
    error: activeHook.error,

    // Data
    messages: activeHook.messages,
    lastMessage: activeHook.lastMessage,
    tasks: activeHook.tasks,
    logs: activeHook.logs,
    concepts: activeHook.concepts,
    memoryTasks: activeHook.memoryTasks,
    reasonerStats: activeHook.reasonerStats,

    // Actions
    sendRawMessage: activeHook.sendRawMessage,
    sendMessage: unifiedSendMessage,
    ...unifiedTaskHandlers,

    // Legacy compatibility
    requestConcepts: useCRDT ? () => unifiedSendMessage('get_concepts') : wsHook.requestConcepts,
    requestTopTasks: useCRDT ? () => unifiedSendMessage('get_top_tasks') : wsHook.requestTopTasks,
    requestState: useCRDT ? () => crdtHook.sendRawMessage({ type: 'request_state' }) : wsHook.requestState,
    reconnect: useCRDT ? () => {} : wsHook.reconnect,
    disconnect: useCRDT ? () => crdtHook.provider?.disconnect() : wsHook.disconnect,
    reconnectAttempts: useCRDT ? 0 : wsHook.reconnectAttempts
  };
};

export default useUnifiedWebSocket;