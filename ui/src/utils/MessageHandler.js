import { parseWebSocketMessage, createStateUpdater } from './webSocketUtils';

class MessageHandler {
  constructor(setData, setError, setLastMessage, setMessages, config) {
    this.setData = setData;
    this.setError = setError;
    this.setLastMessage = setLastMessage;
    this.setMessages = setMessages;
    this.config = config;
  }

  async handleMessage(event) {
    this.setLastMessage?.(event);

    // Handle message history
    if (this.config.enableMessageHistory && this.setMessages) {
      try {
        const message = await parseWebSocketMessage(event);
        this.setMessages(prev => [...prev, message]);
      } catch (parseError) {
        this.setMessages?.(prev => [...prev, {
          type: 'error',
          data: event.data,
          error: parseError.message
        }]);
      }
    }

    // Handle state updates
    if (this.setData) {
      try {
        const message = await parseWebSocketMessage(event);
        this.handleStateUpdate(message);
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
      }
    }
  }

  handleStateUpdate(message) {
    createStateUpdater(this.setData)(message);
  }

  handleConnect() {
    this.setError?.(null);
  }

  handleError(error) {
    this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
  }
}

export default MessageHandler;