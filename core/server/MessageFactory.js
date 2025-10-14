import { WebSocketUtils, MESSAGE_TYPES } from './WebSocketUtils.js';

class MessageFactory {
  // Convenience methods that delegate to WebSocketUtils for consistency
  static createSuccessResponse(operation, data = {}) {
    return WebSocketUtils.createSuccessResponse(operation, data);
  }

  static createErrorResponse(operation, error, details = {}) {
    return WebSocketUtils.createErrorResponse(operation, error, details);
  }

  static createWelcomeMessage(clientId, connectionId) {
    return WebSocketUtils.createWelcomeMessage(clientId, connectionId);
  }

  static createHeartbeatMessage() {
    return WebSocketUtils.createHeartbeatMessage();
  }

  static createStateUpdateMessage(state, stats = {}) {
    return WebSocketUtils.createMessage(MESSAGE_TYPES.COMPLETE_STATE, { ...state, stats });
  }

  static createTaskUpdateMessage(taskId, updateData, source = null) {
    return WebSocketUtils.createTaskMessage(MESSAGE_TYPES.TASK_UPDATE, taskId, updateData, source);
  }

  static createTaskStreamMessage(taskId, data, source = null) {
    return WebSocketUtils.createTaskMessage(MESSAGE_TYPES.TASK_STREAM_UPDATE, taskId, data, source);
  }

  static createStreamSubscriptionMessage(streamId, status, streamType = null) {
    return WebSocketUtils.createStreamMessage(MESSAGE_TYPES.STREAM_SUBSCRIPTION_CONFIRMED, streamId, { status, streamType });
  }

  static createStreamUnsubscriptionMessage(streamId, status) {
    return WebSocketUtils.createStreamMessage(MESSAGE_TYPES.STREAM_UNSUBSCRIBED, streamId, { status });
  }

  static createStreamDataMessage(streamId, data, source = null) {
    return WebSocketUtils.createStreamMessage(MESSAGE_TYPES.STREAM_DATA, streamId, data, source);
  }

  static createStreamErrorMessage(streamId, error) {
    return WebSocketUtils.createStreamMessage(MESSAGE_TYPES.STREAM_ERROR, streamId, { error: error.message || error });
  }

  static createSubscriptionConfirmationMessage(eventTypes) {
    return WebSocketUtils.createMessage(MESSAGE_TYPES.SUBSCRIPTION_CONFIRMED, { eventTypes: Array.from(eventTypes) });
  }

  static createEventMessage(eventType, data, filters = {}) {
    return WebSocketUtils.createEventMessage(eventType, data, filters);
  }

  static createTaskStreamHistoryMessage(taskId, history) {
    return WebSocketUtils.createTaskMessage(MESSAGE_TYPES.TASK_STREAM_HISTORY, taskId, { history: history.slice(-100) });
  }

  static createClientMessage(clientId, messageType, payload = {}) {
    return {
      clientId,
      type: messageType,
      payload,
      timestamp: new Date().toISOString()
    };
  }

  static createSystemMessage(type, payload = {}) {
    return WebSocketUtils.createMessage(type, { system: true, ...payload });
  }
}

export default MessageFactory;