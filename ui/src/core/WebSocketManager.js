import { useState, useEffect, useCallback, useRef } from 'react';

export const useWebSocket = (url, config = {}) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const currentUrlRef = useRef(url);

  const {
    maxReconnectAttempts = 10,
    reconnectInterval = 3000,
    maxMessages = 1000,
    messageRetention = 500
  } = config;

  const connect = useCallback(() => {
    if (['connecting', 'connected'].includes(connectionStatus)) return;

    setError(null);
    setConnectionStatus('connecting');

    const websocket = new WebSocket(currentUrlRef.current);

    websocket.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      setWs(websocket);
      reconnectAttemptsRef.current = 0;
    };

    websocket.onclose = (event) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');

      !event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts && (
        setConnectionStatus('reconnecting'),
        reconnectAttemptsRef.current++,
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
      );
    };

    websocket.onerror = () => {
      setError({ message: 'Connection failed', timestamp: new Date().toISOString() });
      setConnectionStatus('disconnected');
    };

    websocket.onmessage = (event) => {
      setLastMessage(event);

      event.data instanceof Blob
        ? setMessages(prev => [...prev, { type: 'binary', data: event.data }])
        : (() => {
            try {
              const data = JSON.parse(event.data);
              setMessages(prev => [...prev, data]);
            } catch (e) {
              setMessages(prev => [...prev, { type: 'error', data: event.data, error: e.message }]);
            }
          })();
    };
  }, [connectionStatus, maxReconnectAttempts, reconnectInterval]);

  const sendMessage = useCallback((message) => {
    if (ws && isConnected) {
      try {
        ws.send(typeof message === 'string' ? message : JSON.stringify(message));
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }, [ws, isConnected]);

  const disconnect = useCallback(() => {
    reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
    ws?.close(1000, "Manual disconnect");
    setError(null);
    setConnectionStatus('disconnected');
    setIsConnected(false);
  }, [ws]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    currentUrlRef.current = url;

    if (isConnected && ws) {
      disconnect();
      setTimeout(connect, 100);
    } else if (connectionStatus === 'disconnected') {
      connect();
    }

    return () => {
      reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
      disconnect();
    };
  }, [url]);

  useEffect(() => {
    messages.length > maxMessages && setMessages(prev => prev.slice(-messageRetention));
  }, [messages, maxMessages, messageRetention]);

  return {
    isConnected,
    connectionStatus,
    messages,
    lastMessage,
    error,
    sendMessage,
    reconnect,
    disconnect,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};

export default useWebSocket;
