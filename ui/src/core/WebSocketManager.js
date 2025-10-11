import { useState, useEffect, useCallback, useRef } from 'react';

// Custom hook for robust, adaptive WebSocket management
export const useWebSocket = (url) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, reconnecting
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const currentUrlRef = useRef(url);
  const maxReconnectAttempts = 10;
  const reconnectInterval = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (connectionStatus === 'connecting' || connectionStatus === 'connected') {
      return; // Don't connect if already connecting or connected
    }

    setConnectionStatus('connecting');
    console.log('Attempting to connect to:', currentUrlRef.current);

    const websocket = new WebSocket(currentUrlRef.current);

    websocket.onopen = () => {
      console.log('Connected to WebSocket server:', currentUrlRef.current);
      setIsConnected(true);
      setConnectionStatus('connected');
      setWs(websocket);
      reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
    };

    websocket.onclose = (event) => {
      console.log('Disconnected from WebSocket server:', event.reason || 'No reason');
      setIsConnected(false);
      setConnectionStatus('disconnected');

      // Attempt to reconnect if it wasn't a manual close
      if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
        setConnectionStatus('reconnecting');
        reconnectAttemptsRef.current += 1;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
      } catch (e) {
        console.error('Error parsing message:', e);
        // Add the raw message anyway, marked as error
        setMessages(prev => [...prev, { type: 'error', data: event.data, error: e.message }]);
      }
    };

    return websocket;
  }, [connectionStatus]);

  const sendMessage = useCallback((message) => {
    if (ws && isConnected) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        ws.send(messageStr);
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
      return false;
    }
  }, [ws, isConnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws) {
      ws.close(1000, "Manual disconnect");
    }
    setConnectionStatus('disconnected');
    setIsConnected(false);
  }, [ws]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000); // Delay reconnect to allow for cleanup
  }, [connect, disconnect]);

  useEffect(() => {
    // Update current URL ref when URL prop changes
    currentUrlRef.current = url;

    // If we're already connected and URL changed, disconnect and reconnect
    if (isConnected && ws) {
      disconnect();
      setTimeout(() => {
        connect();
      }, 100);
    } else if (connectionStatus === 'disconnected') {
      // Only connect if we're not already trying to connect
      connect();
    }

    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [url]); // Only depend on URL changes

  // Clear messages periodically to prevent memory issues
  useEffect(() => {
    if (messages.length > 1000) { // Limit to 1000 messages
      setMessages(prev => prev.slice(-500)); // Keep last 500
    }
  }, [messages]);

  return {
    isConnected,
    connectionStatus,
    messages,
    sendMessage,
    reconnect,
    disconnect,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};

export default useWebSocket;