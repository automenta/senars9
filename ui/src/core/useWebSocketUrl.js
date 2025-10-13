// Custom hook for WebSocket URL management
import { useMemo } from 'react';
import { WS_CONFIG } from '../constants';

export const useWebSocketUrl = () => {
  const wsUrl = useMemo(() => {
    // Create WebSocket URL using the same host as the page (for same-origin)
    const urlParams = new URLSearchParams(window.location.search);
    const serverPort = urlParams.get('serverPort') || WS_CONFIG.defaultPort;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host.split(':')[0] || 'localhost';

    // Use simple protocol by adding query parameter since browser WebSockets can't send custom headers
    return `${wsProtocol}//${wsHost}:${serverPort}?protocol=simple`;
  }, []);

  return wsUrl;
};