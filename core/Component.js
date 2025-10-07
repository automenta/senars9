/**
 * @file: core/Component.js
 * @description: Base class for all SeNARS components, providing a standardized lifecycle, event handling, and monitoring interface.
 * @module Component
 */

class Component {
  /**
   * Initializes the component with a given configuration.
   * @param {object} config - The component's configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config) {
    this.config = config;
    this.status = 'initialized';
  }

  /**
   * Starts the component's operations.
   * @returns {Promise<void>}
   */
  async start() {
    this.status = 'running';
  }

  /**
   * Stops the component's operations.
   * @returns {Promise<void>}
   */
  async stop() {
    this.status = 'stopped';
  }

  /**
   * Cleans up resources used by the component.
   * @returns {Promise<void>}
   */
  async destroy() {
    this.status = 'destroyed';
  }

  /**
   * Retrieves the current health of the component.
   * @returns {{status: string, issues: Array<object>}}
   */
  getHealth() {
    return {
      status: 'healthy',
      issues: [],
    };
  }

  /**
   * Retrieves performance and usage metrics for the component.
   * @returns {object}
   */
  getMetrics() {
    return {};
  }

  /**
   * Retrieves the current operational status of the component.
   * @returns {{status: string}}
   */
  getStatus() {
    return {
      status: this.status || 'uninitialized',
    };
  }

  /**
   * Registers an event handler for a specific event.
   * @param {string} event - The name of the event.
   * @param {Function} handler - The callback function to execute.
   */
  on(event, handler) {
    if (!this.core || !this.core.messages) {
      throw new Error('Messages component not available on core.');
    }
    this.core.messages.on(event, handler);
  }

  /**
   * Unregisters an event handler for a specific event.
   * @param {string} event - The name of the event.
   * @param {Function} handler - The callback function to remove.
   */
  off(event, handler) {
    if (!this.core || !this.core.messages) {
      throw new Error('Messages component not available on core.');
    }
    this.core.messages.off(event, handler);
  }

  /**
   * Emits an event with the given data.
   * @param {string} event - The name of the event to emit.
   * @param {*} data - The data to pass to the event handlers.
   */
  emit(event, data) {
    if (!this.core || !this.core.messages) {
      throw new Error('Messages component not available on core.');
    }
    this.core.messages.emit(event, data);
  }
}

export default Component;