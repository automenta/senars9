import { parseWebSocketMessage, createStateUpdater, manageMessageHistory } from './webSocketUtils';

class MessageHandler {
  constructor(setData, setError, setLastMessage, setMessages, config, sendMessage) {
    Object.assign(this, { setData, setError, setLastMessage, setMessages, config, sendMessage });
  }

  async handleMessage(event) {
    this.setLastMessage?.(event);

    if (this.config.enableMessageHistory && this.setMessages) {
      try {
        const message = await parseWebSocketMessage(event);
        this.setMessages(prev => manageMessageHistory([...prev, message], this.config.maxMessages, this.config.messageRetention));
      } catch (parseError) {
        this.setMessages?.(prev => [...prev, { type: 'error', data: event.data, error: parseError.message }]);
      }
    }

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
    this.config.autoRequestState && setTimeout(() => this.sendMessage?.({ type: 'request_state' }), 100);
  }

  handleError(error) {
    this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
  }
}

export default MessageHandler;