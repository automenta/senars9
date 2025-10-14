import { WebSocketUtils, MESSAGE_TYPES } from './WebSocketUtils.js';

class MessageFactory {
  static createMessage(type, payload = {}, timestamp = null) {
    return WebSocketUtils.createMessage(type, payload, timestamp);
  }

  static createResponse(type, payload = {}, timestamp = null) {
    return this.createMessage(type, payload, timestamp);
  }

  static createSuccessResponse(operation, data = {}) {
    return this.createResponse(MESSAGE_TYPES.COMMAND_RESPONSE, {
      operation,
      status: 'success',
      ...data
    });
  }

  static createErrorResponse(operation, error, details = {}) {
    return this.createResponse(MESSAGE_TYPES.ERROR, {
      operation,
      status: 'error',
      message: error.message || error,
      details
    });
  }

  static createCommandErrorResponse(command, error) {
    return this.createResponse(MESSAGE_TYPES.COMMAND_RESPONSE, {
      command,
      status: 'error',
      error: error.message || error
    });
  }

  static createCommandSuccessResponse(command, data = {}) {
    return this.createResponse(MESSAGE_TYPES.COMMAND_RESPONSE, {
      command,
      status: 'success',
      ...data
    });
  }

  static createWelcomeMessage(clientId, connectionId) {
    return this.createResponse(MESSAGE_TYPES.WELCOME, {
      clientId,
      serverInfo: {
        version: '2.0.0',
        features: ['nars_protocol', 'realtime_streaming', 'task_sync']
      },
      connectionId
    });
  }

  static createHeartbeatMessage() {
    return this.createResponse(MESSAGE_TYPES.HEARTBEAT);
  }

  static createStateUpdateMessage(state, stats = {}) {
    return this.createResponse(MESSAGE_TYPES.COMPLETE_STATE, {
      ...state,
      stats
    });
  }

  static createTaskUpdateMessage(taskId, updateData, source = null) {
    return this.createResponse(MESSAGE_TYPES.TASK_UPDATE, {
      taskId,
      data: updateData,
      source
    });
  }

  static createTaskStreamMessage(taskId, data, source = null) {
    return this.createResponse(MESSAGE_TYPES.TASK_STREAM_UPDATE, {
      taskId,
      data,
      source
    });
  }

  static createStreamSubscriptionMessage(streamId, status, streamType = null) {
    return this.createResponse(MESSAGE_TYPES.STREAM_SUBSCRIPTION_CONFIRMED, {
      streamId,
      status,
      streamType
    });
  }

  static createStreamUnsubscriptionMessage(streamId, status) {
    return this.createResponse(MESSAGE_TYPES.STREAM_UNSUBSCRIBED, {
      streamId,
      status
    });
  }

  static createStreamDataMessage(streamId, data, source = null) {
    return this.createResponse(MESSAGE_TYPES.STREAM_DATA, {
      streamId,
      data,
      source
    });
  }

  static createStreamErrorMessage(streamId, error) {
    return this.createResponse(MESSAGE_TYPES.STREAM_ERROR, {
      streamId,
      error: error.message || error
    });
  }

  static createSubscriptionConfirmationMessage(eventTypes) {
    return this.createResponse(MESSAGE_TYPES.SUBSCRIPTION_CONFIRMED, {
      eventTypes: Array.from(eventTypes)
    });
  }

  static createEventMessage(eventType, data, filters = {}) {
    return this.createResponse(MESSAGE_TYPES.EVENT, {
      eventType,
      data,
      filters
    });
  }

  static createTaskStreamHistoryMessage(taskId, history) {
    return this.createResponse(MESSAGE_TYPES.TASK_STREAM_HISTORY, {
      taskId,
      history: history.slice(-100) // Limit history size
    });
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
    return this.createResponse(type, {
      system: true,
      ...payload
    });
  }
}

export default MessageFactory;