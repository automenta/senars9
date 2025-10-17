/**
 * EventBus - Lightweight event bus for decoupled communication between components
 * Implements the event system as specified in DESIGN.md
 */

export class EventBus {
  constructor() {
    this._events = new Map(); // Map<eventName, Set<listener>>
  }

  /**
   * Register an event listener
   * @param {string} eventName - Name of the event
   * @param {Function} listener - Listener function
   */
  on(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new Error('Event listener must be a function');
    }

    if (!this._events.has(eventName)) {
      this._events.set(eventName, new Set());
    }

    this._events.get(eventName).add(listener);
  }

  /**
   * Unregister an event listener
   * @param {string} eventName - Name of the event
   * @param {Function} listener - Listener function to remove
   * @returns {boolean} - True if listener was found and removed
   */
  off(eventName, listener) {
    if (!this._events.has(eventName)) {
      return false;
    }

    return this._events.get(eventName).delete(listener);
  }

  /**
   * Emit an event with data
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to pass to listeners
   */
  emit(eventName, data) {
    if (!this._events.has(eventName)) {
      return;
    }

    // Create a copy of listeners in case one removes itself during iteration
    const listeners = Array.from(this._events.get(eventName));

    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for '${eventName}':`, error);
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Name of the event
   */
  removeAllListeners(eventName) {
    this._events.delete(eventName);
  }

  /**
   * Remove all listeners for all events
   */
  removeAllListenersForAllEvents() {
    this._events.clear();
  }

  /**
   * Get all event names that have listeners
   * @returns {Array<string>} - Array of event names
   */
  eventNames() {
    return Array.from(this._events.keys());
  }

  /**
   * Get listener count for an event
   * @param {string} eventName - Name of the event
   * @returns {number} - Number of listeners
   */
  listenerCount(eventName) {
    if (!this._events.has(eventName)) {
      return 0;
    }

    return this._events.get(eventName).size;
  }

  /**
   * Check if an event has any listeners
   * @param {string} eventName - Name of the event
   * @returns {boolean} - True if event has listeners
   */
  hasListeners(eventName) {
    return this.listenerCount(eventName) > 0;
  }

  /**
   * Register a one-time event listener
   * @param {string} eventName - Name of the event
   * @param {Function} listener - Listener function (will be removed after first call)
   */
  once(eventName, listener) {
    const onceListener = (data) => {
      this.off(eventName, onceListener);
      listener(data);
    };

    this.on(eventName, onceListener);
  }

  /**
   * Wait for an event to be emitted (returns a Promise)
   * @param {string} eventName - Name of the event to wait for
   * @returns {Promise} - Promise that resolves with event data
   */
  waitFor(eventName) {
    return new Promise((resolve) => {
      this.once(eventName, resolve);
    });
  }
}