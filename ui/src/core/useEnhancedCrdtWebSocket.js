/**
 * Enhanced WebSocket hook with notifications and error handling
 */

import { useCallback } from 'react';
import useCrdtWebSocket from './crdtWebSocket';
import { useNotification } from './NotificationSystem';

/**
 * Enhanced WebSocket hook that provides notifications on connection events
 */
export const useEnhancedCrdtWebSocket = (url) => {
  const { addNotification } = useNotification();
  const baseWebSocket = useCrdtWebSocket(url);

  // Enhanced connection handling with notifications
  const enhancedConnectionStatus = useCallback((status) => {
    addNotification(`Connection status: ${status}`, 
      status === 'connected' ? 'success' : 
      status === 'disconnected' ? 'error' : 'info');
  }, [addNotification]);

  // Enhanced error handling
  const handleWebSocketError = useCallback((error) => {
    addNotification(`WebSocket error: ${error.message}`, 'error');
    console.error('WebSocket error:', error);
  }, [addNotification]);

  // Enhanced send message with error handling
  const enhancedSendMessage = useCallback((command, payload = {}) => {
    try {
      baseWebSocket.sendMessage(command, payload);
      // Optionally add feedback for certain commands
      if (['add_task', 'update_task', 'delete_task'].includes(command)) {
        addNotification(`Command ${command} sent`, 'info', 2000);
      }
    } catch (error) {
      handleWebSocketError(error);
    }
  }, [baseWebSocket, addNotification, handleWebSocketError]);

  return {
    ...baseWebSocket,
    enhancedSendMessage,
    handleWebSocketError,
    enhancedConnectionStatus
  };
};

export default useEnhancedCrdtWebSocket;