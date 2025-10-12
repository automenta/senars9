import { useEffect, useCallback, useMemo, useReducer } from 'react';
import useWebSocket from './WebSocketManager';
import TwoPhaseSet from '../utils/crdt';

const initialState = {
  bagregate: new TwoPhaseSet(),
  logs: [],
  concepts: [],
  reasonerStats: null,
};

function crdtReducer(state, action) {
  switch (action.type) {
    case 'bagregate-init':
    case 'bagregate-update':
      return { ...state, bagregate: TwoPhaseSet.fromJSON(action.payload) };
    case 'concepts-init':
        return { ...state, concepts: action.payload };
    case 'logs-init':
        return { ...state, logs: action.payload };
    case 'log':
      return { ...state, logs: [...state.logs, action.payload] };
    case 'concept':
      if (state.concepts.find(c => c.id === action.payload.id)) {
        return state; // Avoid duplicates
      }
      return { ...state, concepts: [...state.concepts, action.payload] };
    case 'reasoner_stats':
      return { ...state, reasonerStats: action.payload };
    default:
      return state;
  }
}

const useCrdtWebSocket = (url) => {
  const { isConnected, connectionStatus, error, sendMessage: wsSendMessage, lastMessage } = useWebSocket(url);
  const [state, dispatch] = useReducer(crdtReducer, initialState);

  useEffect(() => {
    if (lastMessage) {
      try {
        const { type, payload } = JSON.parse(lastMessage.data);
        dispatch({ type, payload });
      } catch (e) {
        console.error('Error processing message:', e);
      }
    }
  }, [lastMessage]);

  const sendCrdtMessage = useCallback((type, payload) => {
    wsSendMessage(JSON.stringify({ type, payload }));
  }, [wsSendMessage]);

  const handleAddTask = useCallback((task) => {
    sendCrdtMessage('task-create', task);
  }, [sendCrdtMessage]);

  const handleUpdateTask = useCallback((task) => {
    sendCrdtMessage('task-update-priority', task);
  }, [sendCrdtMessage]);

  const handleDeleteTask = useCallback((task) => {
    sendCrdtMessage('task-delete', task);
  }, [sendCrdtMessage]);

  const tasks = useMemo(() => state.bagregate.values.sort((a, b) => b.priority - a.priority), [state.bagregate]);

  return {
    isConnected,
    connectionStatus,
    error,
    tasks,
    logs: state.logs,
    concepts: state.concepts,
    reasonerStats: state.reasonerStats,
    sendRawMessage: wsSendMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  };
};

export default useCrdtWebSocket;
