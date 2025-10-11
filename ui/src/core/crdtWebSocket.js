import { useState, useEffect, useCallback, useMemo } from 'react';
import useWebSocket from './WebSocketManager';
import TwoPhaseSet from '../utils/crdt';

const useCrdtWebSocket = (url) => {
  const { isConnected, connectionStatus, error, sendMessage: wsSendMessage, lastMessage } = useWebSocket(url);
  const [bagregate, setBagregate] = useState(new TwoPhaseSet());
  const [logs, setLogs] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [reasonerStats, setReasonerStats] = useState(null);

  useEffect(() => {
    if (lastMessage) {
      try {
        const { type, payload } = JSON.parse(lastMessage.data);

        switch (type) {
            case 'bagregate-init':
            case 'bagregate-update': {
                const newBagregate = TwoPhaseSet.fromJSON(payload);
                setBagregate(newBagregate);
                break;
            }
            case 'log': {
                setLogs(prev => [...prev, payload]);
                break;
            }
            case 'concept': {
                setConcepts(prev => {
                    if (prev.find(c => c.id === payload.id)) {
                        return prev;
                    }
                    return [...prev, payload]
                });
                break;
            }
            case 'reasoner_stats': {
                setReasonerStats(payload);
                break;
            }
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    }
  }, [lastMessage]);

  const sendCrdtMessage = useCallback((type, payload) => {
    wsSendMessage(JSON.stringify({ type, payload }));
  }, [wsSendMessage]);

  const tasks = useMemo(() => bagregate.values.sort((a, b) => b.priority - a.priority), [bagregate]);

  return {
    isConnected,
    connectionStatus,
    error,
    tasks,
    logs,
    concepts,
    reasonerStats,
    sendCrdtMessage,
    sendRawMessage: wsSendMessage,
  };
};

export default useCrdtWebSocket;
