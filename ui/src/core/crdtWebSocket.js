import { useState, useEffect, useCallback, useMemo } from 'react';
import useWebSocket from './WebSocketManager';
import TwoPhaseSet from '../utils/crdt';

const useCrdtWebSocket = (url) => {
  const { isConnected, connectionStatus, error, messages, sendMessage: wsSendMessage, lastMessage } = useWebSocket(url);
  const [bagregate, setBagregate] = useState(new TwoPhaseSet());

  useEffect(() => {
    if (lastMessage) {
      try {
        const { type, payload } = JSON.parse(lastMessage.data);

        if (type === 'bagregate-init' || type === 'bagregate-update') {
          const newBagregate = TwoPhaseSet.fromJSON(payload);
          setBagregate(newBagregate);
        }
      } catch (e) {
        console.error('Error processing CRDT message:', e);
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
    messages, // Pass through the original messages array
    tasks,
    sendCrdtMessage,
    sendRawMessage: wsSendMessage, // Expose the raw send message for other uses
  };
};

export default useCrdtWebSocket;
