import { WebSocketUtils } from './WebSocketUtils.js';

class CommonServerUtils {
  static handleConnectionError(wss, clientId, operation, error) {
    return WebSocketUtils.handleAndSendError(wss, operation, error, clientId);
  }

  static handleStreamError(wss, clientId, streamId, operation, error) {
    const errorMsg = `Stream ${operation} failed for ${streamId}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    WebSocketUtils.error(errorMsg);

    if (wss && clientId) {
      WebSocketUtils.sendError(wss, clientId, operation, { message: errorMsg, streamId });
    }
    return errorMsg;
  }

  static handleTaskError(wss, clientId, taskId, operation, error) {
    const errorMsg = `Task ${operation} failed for ${taskId}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    WebSocketUtils.error(errorMsg);

    if (wss && clientId) {
      WebSocketUtils.sendError(wss, clientId, operation, { message: errorMsg, taskId });
    }
    return errorMsg;
  }

  static validateRequired(data, fields) {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  static sanitizeClientInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return input;
    return input.slice(0, maxLength);
  }

  static createStandardResponse(type, data = {}) {
    return {
      type,
      payload: data,
      timestamp: new Date().toISOString()
    };
  }

  static createErrorResponse(operation, error, details = {}) {
    return {
      type: 'error',
      payload: {
        operation,
        message: error.message || error,
        details,
        timestamp: new Date().toISOString()
      }
    };
  }
}

export default CommonServerUtils;