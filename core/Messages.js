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

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default Messages;