import { WebSocketUtils } from './WebSocketUtils.js';
import MessageFactory from './MessageFactory.js';

class CommonServerUtils {
  static handleConnectionError(wss, clientId, operation, error) {
    return WebSocketUtils.handleAndSendError(wss, operation, error, clientId);
  }

  static handleStreamError(wss, clientId, streamId, operation, error) {
    const errorMsg = `Stream ${operation} failed for ${streamId}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    WebSocketUtils.error(errorMsg);

    if (wss && clientId) {
      const errorResponse = MessageFactory.createErrorResponse(operation, { message: errorMsg, streamId });
      wss.sendToClient(clientId, errorResponse);
    }
    return errorMsg;
  }

  static handleTaskError(wss, clientId, taskId, operation, error) {
    const errorMsg = `Task ${operation} failed for ${taskId}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    WebSocketUtils.error(errorMsg);

    if (wss && clientId) {
      const errorResponse = MessageFactory.createErrorResponse(operation, { message: errorMsg, taskId });
      wss.sendToClient(clientId, errorResponse);
    }
    return errorMsg;
  }

  static handleError(wss, clientId, operation, error, context = {}) {
    const contextStr = Object.keys(context).length > 0 ? ` (${Object.entries(context).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '';
    const errorMsg = `${operation} failed${contextStr}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    WebSocketUtils.error(errorMsg);

    if (wss && clientId) {
      const errorResponse = MessageFactory.createErrorResponse(operation, { message: errorMsg, ...context });
      wss.sendToClient(clientId, errorResponse);
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
    return MessageFactory.createResponse(type, data);
  }

  static createErrorResponse(operation, error, details = {}) {
    return MessageFactory.createErrorResponse(operation, error, details);
  }
}

export default CommonServerUtils;