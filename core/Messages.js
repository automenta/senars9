import Component from './Component.js';
import { Storage } from './Utils.js';

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

  use(middlewareFn) {
    this.middleware.push(middlewareFn);
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
    if (!this.commands.has(command)) {
      throw new Error(`Command "${command}" not found.`);
    }

    const context = { type: 'command', name: command, data, cancelled: false };
    return this._executeMiddleware(context, (ctx) =>
      this._executeWithRetry(this.commands.get(ctx.name), ctx.data, 'command', command));
  }

  // === UNIFIED COMMAND/EVENT PROCESSING ===

  /**
   * Registers a unified processor for both commands and events.
   * @param {string} name - The name of the processor.
   * @param {Function} processor - The processor function.
   * @param {object} [options={}] - Processor options.
   * @param {Array<string>} [options.events=[]] - Events this processor handles.
   * @param {Array<string>} [options.commands=[]] - Commands this processor handles.
   * @param {number} [options.priority=0] - Processor priority.
   */
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

  /**
   * Processes a message through unified command/event system.
   * @param {object} message - The message to process.
   * @param {string} message.type - 'command' or 'event'.
   * @param {string} message.name - The name of the command/event.
   * @param {*} message.data - The message data.
   * @returns {*} The processing result.
   */
  async process(message) {
    const { type, name, data } = message;

    if (type === 'command') {
      return this.execute(name, data);
    } else if (type === 'event') {
      this.emit(name, data);
      return { success: true };
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }
  }

  // === ERROR HANDLING AND RECOVERY ===

  /**
   * Registers an error handler for specific error types.
   * @param {string} errorType - The type of error to handle.
   * @param {Function} handler - The error handler function.
   */
  registerErrorHandler(errorType, handler) {
    if (!this.errorHandlers.has(errorType)) {
      this.errorHandlers.set(errorType, []);
    }
    this.errorHandlers.get(errorType).push(handler);
  }

  /**
   * Sets a retry policy for specific operations.
   * @param {string} operation - The operation name.
   * @param {object} policy - The retry policy.
   * @param {number} policy.maxRetries - Maximum retry attempts.
   * @param {number} policy.retryDelay - Delay between retries.
   * @param {number} [policy.backoffMultiplier=2] - Backoff multiplier.
   */
  setRetryPolicy(operation, policy) {
    this.retryPolicies.set(operation, {
      maxRetries: policy.maxRetries || 3,
      retryDelay: policy.retryDelay || 1000,
      backoffMultiplier: policy.backoffMultiplier || 2
    });
  }

  /**
   * Gets system health and error statistics.
   * @returns {object} Health and error statistics.
   */
  getHealth() {
    return {
      events: this.events.size,
      commands: this.commands.size,
      processors: this.processors.size,
      middleware: this.middleware.length,
      errorHandlers: this.errorHandlers.size,
      retryPolicies: this.retryPolicies.size,
      isHealthy: true // Could add more sophisticated health checks
    };
  }

  /**
   * Executes the middleware chain with enhanced error handling.
   * @param {object} context - The context object for the middleware.
   * @param {Function} final - The final function to call after the chain.
   * @returns {*} The result of the final function.
   * @private
   */
  _executeMiddleware(context, final) {
    let index = -1;
    const dispatch = (i) => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      if (context.cancelled) return;

      let fn = this.middleware[i];
      if (i === this.middleware.length) {
        fn = final;
      }

      if (!fn) return;

      try {
        const result = fn(context, () => dispatch(i + 1));

        // Handle both sync and async results
        if (result && typeof result.then === 'function') {
          return result.catch(err => this._handleError(err, context, () => dispatch(i + 1)));
        }

        return result;
      } catch (err) {
        return this._handleError(err, context, () => dispatch(i + 1));
      }
    };

    const result = dispatch(0);

    // Handle both sync and async results at the top level
    if (result && typeof result.then === 'function') {
      return result.catch(err => this._handleError(err, context));
    }

    return result;
  }

  /**
   * Executes a function with retry logic and error handling.
   * @param {Function} fn - The function to execute.
   * @param {*} data - The data to pass to the function.
   * @param {string} type - The type of operation ('command' or 'event').
   * @param {string} name - The name of the operation.
   * @returns {*} The result of the function.
   * @private
   */
  _executeWithRetry(fn, data, type, name) {
    const policy = this.retryPolicies.get(name) || this.retryPolicies.get('default');
    let lastError;

    // Synchronous retry logic for compatibility
    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        const result = fn(data);
        // Handle both sync and async results
        if (result && typeof result.then === 'function') {
          // If async, we need to return a promise for the whole chain
          return result.then(
            (asyncResult) => {
              if (attempt > 0) {
                console.log(`Operation ${name} succeeded after ${attempt} retries`);
              }
              return asyncResult;
            },
            (error) => {
              if (attempt < policy.maxRetries) {
                console.warn(`Operation ${name} failed (attempt ${attempt + 1}), will retry:`, error.message);
                return new Promise((resolve) => {
                  setTimeout(() => {
                    resolve(this._executeWithRetry(fn, data, type, name));
                  }, policy.retryDelay * Math.pow(policy.backoffMultiplier, attempt));
                });
              } else {
                console.error(`Operation ${name} failed after ${policy.maxRetries + 1} attempts:`, error);
                return this._handleError(error, { type, name, data });
              }
            }
          );
        } else {
          // Synchronous result
          if (attempt > 0) {
            console.log(`Operation ${name} succeeded after ${attempt} retries`);
          }
          return result;
        }
      } catch (error) {
        lastError = error;

        if (attempt < policy.maxRetries) {
          console.warn(`Operation ${name} failed (attempt ${attempt + 1}), retrying:`, error.message);
          // For sync operations, we can't delay, so we continue immediately
        } else {
          console.error(`Operation ${name} failed after ${policy.maxRetries + 1} attempts:`, error);
        }
      }
    }

    // Try error handlers before giving up
    return this._handleError(lastError, { type, name, data });
  }

  /**
   * Handles errors with registered error handlers.
   * @param {Error} error - The error that occurred.
   * @param {object} context - The operation context.
   * @param {Function} [retryFn] - Optional retry function.
   * @returns {*} The error handling result.
   * @private
   */
  _handleError(error, context, retryFn) {
    const errorType = error.constructor.name || 'Error';

    // Try specific error handlers
    if (this.errorHandlers.has(errorType)) {
      for (const handler of this.errorHandlers.get(errorType)) {
        try {
          const result = handler(error, context, retryFn);
          // Handle both sync and async results
          if (result && typeof result.then === 'function') {
            return result;
          }
          if (result) {
            return result; // Handler successfully recovered
          }
        } catch (handlerError) {
          console.error(`Error handler for ${errorType} failed:`, handlerError);
        }
      }
    }

    // Try generic error handlers
    if (this.errorHandlers.has('Error')) {
      for (const handler of this.errorHandlers.get('Error')) {
        try {
          const result = handler(error, context, retryFn);
          // Handle both sync and async results
          if (result && typeof result.then === 'function') {
            return result;
          }
          if (result) {
            return result;
          }
        } catch (handlerError) {
          console.error('Generic error handler failed:', handlerError);
        }
      }
    }

    // If no handlers recovered, throw the original error
    throw error;
  }

  /**
   * Utility function for delays.
   * @param {number} ms - Milliseconds to delay.
   * @returns {Promise} Promise that resolves after the delay.
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default Messages;