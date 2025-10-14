import { WebSocketUtils } from './WebSocketUtils.js';

/**
 * Centralized error handling utilities for server components
 * Consolidates error handling patterns across all server classes
 */
class ErrorHandler {
  static handleConnectionError(wss, clientId, operation, error) {
    return WebSocketUtils.handleConnectionError(wss, clientId, operation, error);
  }

  static handleStreamError(wss, clientId, streamId, operation, error) {
    return WebSocketUtils.handleStreamError(wss, clientId, streamId, operation, error);
  }

  static handleTaskError(wss, clientId, taskId, operation, error) {
    return WebSocketUtils.handleTaskError(wss, clientId, taskId, operation, error);
  }

  static handleGenericError(wss, clientId, operation, error, context = {}) {
    return WebSocketUtils.handleGenericError(wss, clientId, operation, error, context);
  }

  static sendError(wss, clientId, operation, error) {
    WebSocketUtils.sendError(wss, clientId, operation, error);
  }

  static handleAndSendError(wss, operation, error, clientId = null) {
    return WebSocketUtils.handleAndSendError(wss, operation, error, clientId);
  }
}

export default ErrorHandler;