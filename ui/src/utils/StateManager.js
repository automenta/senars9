import { manageMessageHistory } from './webSocketUtils';

class StateManager {
  constructor(setData, setError, setLastMessage, setMessages, config, sendMessage) {
    this.setData = setData;
    this.setError = setError;
    this.setLastMessage = setLastMessage;
    this.setMessages = setMessages;
    this.config = config;
    this.sendMessage = sendMessage;
  }

  manageMessageHistory(messages) {
    return this.config.enableMessageHistory && messages.length > this.config.maxMessages
      ? messages.slice(-this.config.messageRetention)
      : messages;
  }

  handleConnect() {
    this.setError?.(null);
    if (this.config.autoRequestState) {
      setTimeout(() => this.sendMessage?.({ type: 'request_state' }), 100);
    }
  }

  handleError(error) {
    this.setError?.({ message: error.message, timestamp: new Date().toISOString() });
  }
}

export default StateManager;