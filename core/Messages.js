import Component from './Component.js';
import { Storage, Retry } from './Utils.js';

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
    const handler = this.commands.has(command) ? this.commands.get(command) : (() => { throw new Error(`Command "${command}" not found.`); })();
    const context = { type: 'command', name: command, data, cancelled: false };

    const executeWithRetry = (ctx) => {
      const policy = this.retryPolicies.get(command) || this.retryPolicies.get('default');
      if (policy.maxRetries === 0) {
        return handler(ctx.data);
      }
      return Retry.execute(() => handler(ctx.data), policy);
    };

    const result = this._executeMiddleware(context, executeWithRetry);

    // For backward compatibility, if no middleware and no command-specific retries, return result directly
    const commandPolicy = this.retryPolicies.get(command);
    if (this.middleware.length === 0 && (!commandPolicy || commandPolicy.maxRetries === 0)) {
      return result;
    }

    return result;
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

    const tryHandlers = (handlers) => {
      for (const handler of handlers) {
        try {
          const result = handler(error, context, retryFn);
          if (result?.then) return result;
          if (result) return result;
        } catch (handlerError) {
          console.error(`Error handler failed:`, handlerError);
        }
      }
    };

    // Try specific error handlers first
    if (this.errorHandlers.has(errorType)) {
      const result = tryHandlers(this.errorHandlers.get(errorType));
      if (result) return result;
    }

    // Try generic error handlers
    if (this.errorHandlers.has('Error')) {
      const result = tryHandlers(this.errorHandlers.get('Error'));
      if (result) return result;
    }

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