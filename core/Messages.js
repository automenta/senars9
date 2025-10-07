/**
 * @file: core/Messages.js
 * @description: Unified system for event publishing/subscription and command execution, with middleware support.
 * @module Messages
 */

import Component from './Component.js';

class Messages extends Component {
  constructor() {
    super();
    this.events = new Map();
    this.commands = new Map();
    this.middleware = [];
  }

  /**
   * Initializes the Messages system.
   * @param {object} config - The configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.events.clear();
    this.commands.clear();
    this.middleware = [];
  }

  /**
   * Adds a middleware function to the pipeline.
   * @param {Function} middlewareFn - The middleware function to add.
   */
  use(middlewareFn) {
    this.middleware.push(middlewareFn);
  }

  /**
   * Registers a handler for a specific event.
   * @param {string} event - The name of the event.
   * @param {Function} handler - The callback function.
   */
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(handler);
  }

  /**
   * Unregisters a handler for a specific event.
   * @param {string} event - The name of the event.
   * @param {Function} handler - The handler function to remove.
   */
  off(event, handler) {
    if (!this.events.has(event)) {
      return;
    }
    const handlers = this.events.get(event).filter(h => h !== handler);
    if (handlers.length === 0) {
      this.events.delete(event);
    } else {
      this.events.set(event, handlers);
    }
  }

  /**
   * Emits an event, processing it through the middleware pipeline.
   * @param {string} event - The name of the event.
   * @param {*} data - The data to pass to the event handlers.
   */
  emit(event, data) {
    const context = { type: 'event', name: event, data, cancelled: false };
    const finalEmit = (ctx) => {
      if (this.events.has(ctx.name)) {
        this.events.get(ctx.name).forEach(handler => handler(ctx.data));
      }
    };

    this._executeMiddleware(context, finalEmit);
  }

  /**
   * Registers a handler for a command.
   * @param {string} command - The name of the command.
   * @param {Function} handler - The function to execute for the command.
   */
  registerCommand(command, handler) {
    if (this.commands.has(command)) {
      console.warn(`Command "${command}" is already registered. Overwriting.`);
    }
    this.commands.set(command, handler);
  }

  /**
   * Executes a command, processing it through the middleware pipeline.
   * @param {string} command - The name of the command to execute.
   * @param {*} data - The data or arguments for the command.
   * @returns {*} The result of the command execution.
   */
  execute(command, data) {
    if (!this.commands.has(command)) {
      throw new Error(`Command "${command}" not found.`);
    }

    const context = { type: 'command', name: command, data, cancelled: false };
    const finalExecute = (ctx) => {
      const handler = this.commands.get(ctx.name);
      return handler(ctx.data);
    };

    return this._executeMiddleware(context, finalExecute);
  }

  /**
   * Executes the middleware chain.
   * @param {object} context - The context object for the middleware.
   * @param {Function} final - The final function to call after the chain.
   * @returns {*} The result of the final function.
   * @private
   */
  _executeMiddleware(context, final) {
    let index = -1;
    const dispatch = (i) => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;

      if (context.cancelled) return;

      let fn = this.middleware[i];
      if (i === this.middleware.length) {
        fn = final;
      }

      if (!fn) return;

      try {
        return fn(context, () => dispatch(i + 1));
      } catch (err) {
        throw err;
      }
    };
    return dispatch(0);
  }
}

export default Messages;