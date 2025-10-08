import Component from './Component.js';
import { Storage } from './collections.js';
import { Retry } from './validation.js';

class Messages extends Component {
  constructor() {
    super();
    this.events = new Storage();
    this.commands = new Storage();
    this.middleware = [];
    this.processors = new Storage();
    this.errorHandlers = new Storage();
    this.retryPolicies = new Storage();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.events.clear();
    this.commands.clear();
    this.middleware = [];
    this.processors.clear();
    this.errorHandlers.clear();
    this.retryPolicies.clear();

    this.retryPolicies.set('default', {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      backoffMultiplier: 2
    });
  }

  use(middlewareFn, options = {}) {
    const middleware = {
      fn: middlewareFn,
      priority: options.priority || 0,
      name: options.name || `middleware_${this.middleware.length}`,
      enabled: options.enabled !== false,
      timeout: options.timeout || 5000
    };
    this.middleware.push(middleware);

    // Sort middleware by priority (higher priority first)
    this.middleware.sort((a, b) => b.priority - a.priority);
  }

  // Remove middleware by name
  removeMiddleware(name) {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index > -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  // Enable/disable middleware by name
  setMiddlewareEnabled(name, enabled) {
    const middleware = this.middleware.find(m => m.name === name);
    if (middleware) {
      middleware.enabled = enabled;
      return true;
    }
    return false;
  }

  on(event, handler) {
    const handlers = this.events.get(event) || [];
    handlers.push(handler);
    this.events.set(event, handlers);
  }

  off(event, handler) {
    const handlers = this.events.get(event);
    if (!handlers) return;

    const filtered = handlers.filter(h => h !== handler);
    filtered.length ? this.events.set(event, filtered) : this.events.delete(event);
  }

  emit(event, data) {
    const context = { type: 'event', name: event, data, cancelled: false };
    this._executeMiddleware(context, (ctx) => {
      this.events.get(ctx.name)?.forEach(handler => handler(ctx.data));
    });
  }

  registerCommand(command, handler) {
    if (this.commands.has(command)) {
      console.warn(`Command "${command}" is already registered. Overwriting.`);
    }
    this.commands.set(command, handler);
  }

  execute(command, data) {
    const handler = this.commands.has(command) ? this.commands.get(command) : (() => { throw new Error(`Command "${command}" not found.`); })();
    const context = { type: 'command', name: command, data, cancelled: false };

    const executeWithRetry = (ctx) => {
      const policy = this.retryPolicies.get(command) || this.retryPolicies.get('default');
      return policy.maxRetries === 0 ? handler(ctx.data) : Retry.execute(() => handler(ctx.data), policy);
    };

    const result = this._executeMiddleware(context, executeWithRetry);

    // For backward compatibility, if no middleware and no command-specific retries, return result directly
    const commandPolicy = this.retryPolicies.get(command);
    return this.middleware.length === 0 && (!commandPolicy || commandPolicy.maxRetries === 0) ? result : result;
  }

  registerProcessor(name, processor, options = {}) {
    const { events = [], commands = [], priority = 0 } = options;

    this.processors.set(name, {
      processor,
      events: new Set(events),
      commands: new Set(commands),
      priority,
      registeredAt: new Date()
    });
  }

  async process(message, options = {}) {
    const { type, name, data, metadata = {} } = message;
    const { skipMiddleware = false, timeout = 10000 } = options;

    // Create enhanced context for unified processing
    const context = {
      type,
      name,
      data,
      metadata,
      timestamp: new Date(),
      id: metadata.id || this._generateId(),
      processed: false,
      cancelled: false,
      results: []
    };

    // Apply preprocessing filters
    if (!this._applyPreprocessingFilters(context)) {
      return { success: false, reason: 'filtered', context };
    }

    // Process through middleware unless skipped
    if (!skipMiddleware && this.middleware.length > 0) {
      try {
        await this._executeMiddlewareAsync(context, async (ctx) => {
          await this._processMessageCore(ctx);
          ctx.processed = true;
        }, timeout);
      } catch (error) {
        return this._handleProcessingError(error, context);
      }
    } else {
      // Direct processing without middleware
      await this._processMessageCore(context);
      context.processed = true;
    }

    return {
      success: !context.cancelled,
      context,
      results: context.results
    };
  }

  // Core message processing logic
  async _processMessageCore(context) {
    if (context.type === 'command') {
      const result = await this.execute(context.name, context.data);
      context.results.push({ type: 'command_result', data: result });
    } else if (context.type === 'event') {
      this.emit(context.name, context.data);
      context.results.push({ type: 'event_emitted', data: true });
    } else {
      throw new Error(`Unknown message type: ${context.type}`);
    }
  }

  // Apply preprocessing filters
  _applyPreprocessingFilters(context) {
    // Message type filter
    if (!['command', 'event'].includes(context.type)) {
      return false;
    }

    // Name validation filter
    if (!context.name || typeof context.name !== 'string') {
      return false;
    }

    // Custom filters from processors
    for (const [name, processor] of this.processors.entries()) {
      if (processor.filter && !processor.filter(context)) {
        return false;
      }
    }

    return true;
  }

  // Generate unique message ID
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  registerErrorHandler(errorType, handler) {
    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType).push(handler);
  }

  setRetryPolicy(operation, policy) {
    this.retryPolicies.set(operation, {
      maxRetries: policy.maxRetries || 3,
      retryDelay: policy.retryDelay || 1000,
      backoffMultiplier: policy.backoffMultiplier || 2
    });
  }

  getHealth() {
    return {
      events: this.events.size(),
      commands: this.commands.size(),
      processors: this.processors.size(),
      middleware: this.middleware.length,
      errorHandlers: this.errorHandlers.size(),
      retryPolicies: this.retryPolicies.size(),
      isHealthy: true // Could add more sophisticated health checks
    };
  }

  _executeMiddleware(context, final) {
    let index = -1;
    const dispatch = (i) => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;

      if (context.cancelled) return;

      const middleware = this.middleware[i];
      if (i === this.middleware.length) return final(context);

      if (!middleware || !middleware.enabled) return dispatch(i + 1);

      try {
        return middleware.fn(context, () => dispatch(i + 1));
      } catch (err) {
        return this._handleError(err, context, () => dispatch(i + 1));
      }
    };

    return dispatch(0);
  }

  async _executeMiddlewareAsync(context, final, timeout = 5000) {
    let index = -1;

    const dispatch = async (i) => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      if (context.cancelled) return;

      // Timeout wrapper for each middleware
      const executeWithTimeout = async (middleware, next) => {
        if (middleware.timeout > 0) {
          return Promise.race([
            middleware.fn(context, next),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Middleware ${middleware.name} timed out`)), middleware.timeout)
            )
          ]);
        }
        return middleware.fn(context, next);
      };

      let middleware = this.middleware[i];
      if (i === this.middleware.length) {
        return await Promise.race([
          final(context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Final handler timed out')), timeout)
          )
        ]);
      }

      if (!middleware || !middleware.enabled) {
        return dispatch(i + 1);
      }

      try {
        const result = await executeWithTimeout(middleware, () => dispatch(i + 1));
        return result;
      } catch (err) {
        return this._handleError(err, context, () => dispatch(i + 1));
      }
    };

    return dispatch(0);
  }

  _executeWithRetry(fn, data, type, name) {
    const policy = this.retryPolicies.get(name) || this.retryPolicies.get('default');

    return Retry.execute(() => fn(data), policy).catch(error =>
      this._handleError(error, { type, name, data }));
  }

  _handleError(error, context, retryFn) {
    const errorType = error.constructor.name || 'Error';
    const errorId = this._generateId();

    // Enhanced error context
    const errorContext = {
      ...context,
      errorId,
      errorType,
      originalError: error,
      timestamp: new Date(),
      retryAttempt: context.retryAttempt || 0,
      canRetry: !!retryFn
    };

    // Log error for debugging
    console.error(`[Messages:${errorId}] Error in ${context.type} "${context.name}":`, {
      error: error.message,
      stack: error.stack,
      context: {
        type: context.type,
        name: context.name,
        timestamp: context.timestamp,
        retryAttempt: context.retryAttempt || 0
      }
    });

    const tryHandlers = async (handlers) => {
      for (const handler of handlers) {
        try {
          const result = await handler(error, errorContext, retryFn);
          if (result?.then) {
            const asyncResult = await result;
            if (asyncResult) return asyncResult;
          }
          if (result) return result;
        } catch (handlerError) {
          console.error(`[Messages:${errorId}] Error handler failed:`, handlerError);
        }
      }
    };

    // Try specific error handlers first
    if (this.errorHandlers.has(errorType)) {
      try {
        const result = tryHandlers(this.errorHandlers.get(errorType));
        if (result) return result;
      } catch (handlerError) {
        console.error(`[Messages:${errorId}] Specific error handlers failed:`, handlerError);
      }
    }

    // Try generic error handlers
    if (this.errorHandlers.has('Error')) {
      try {
        const result = tryHandlers(this.errorHandlers.get('Error'));
        if (result) return result;
      } catch (handlerError) {
        console.error(`[Messages:${errorId}] Generic error handlers failed:`, handlerError);
      }
    }

    // Default recovery strategies
    if (retryFn && this._shouldRetry(error, errorContext)) {
      console.warn(`[Messages:${errorId}] Attempting retry for ${context.type} "${context.name}"`);
      return retryFn();
    }

    // If no recovery possible, throw the error
    const finalError = new Error(`Unhandled error in ${context.type} "${context.name}": ${error.message}`);
    finalError.originalError = error;
    finalError.errorId = errorId;
    finalError.context = errorContext;
    throw finalError;
  }

  // Determine if an error should trigger a retry
  _shouldRetry(error, context) {
    const retryableErrors = [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'TemporaryFailure',
      'RateLimitError'
    ];

    const errorType = error.constructor.name || 'Error';
    const isRetryableType = retryableErrors.includes(errorType) ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('network') ||
                           error.message?.includes('temporary');

    const maxRetries = this.retryPolicies.get(context.name)?.maxRetries ||
                      this.retryPolicies.get('default')?.maxRetries || 3;

    return isRetryableType && (context.retryAttempt || 0) < maxRetries;
  }

  _handleProcessingError(error, context) {
    const errorResult = {
      success: false,
      error: error.message,
      errorId: error.errorId || this._generateId(),
      context: {
        type: context.type,
        name: context.name,
        timestamp: context.timestamp,
        cancelled: context.cancelled
      }
    };

    // Log the processing error
    console.error(`[Messages:${errorResult.errorId}] Processing failed:`, {
      error: error.message,
      context: errorResult.context
    });

    return errorResult;
  }

  // Get comprehensive system statistics
  getStats() {
    return {
      health: this.getHealth(),
      middleware: this.middleware.map(m => ({
        name: m.name,
        priority: m.priority,
        enabled: m.enabled,
        timeout: m.timeout
      })),
      processors: Array.from(this.processors.entries()).map(([name, processor]) => ({
        name,
        events: Array.from(processor.events),
        commands: Array.from(processor.commands),
        priority: processor.priority,
        registeredAt: processor.registeredAt
      })),
      errorTypes: Array.from(this.errorHandlers.keys()),
      retryPolicies: Array.from(this.retryPolicies.entries()).map(([name, policy]) => ({
        name,
        maxRetries: policy.maxRetries,
        retryDelay: policy.retryDelay,
        backoffMultiplier: policy.backoffMultiplier
      }))
    };
  }

  // Clear all handlers and reset state
  clear() {
    this.events.clear();
    this.commands.clear();
    this.middleware.length = 0;
    this.processors.clear();
    this.errorHandlers.clear();
    this.retryPolicies.clear();

    // Reinitialize default retry policy
    this.retryPolicies.set('default', {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default Messages;