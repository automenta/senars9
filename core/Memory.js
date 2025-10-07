/**
 * @file: core/Memory.js
 * @description: Provides a high-performance, caching-enabled data store for the SeNARS system.
 * @module Memory
 */

import Component from './Component.js';

class Memory extends Component {
  constructor() {
    super();
    this.storage = new Map();
    this.cache = new Map();
    this.cacheSize = 1000; // Default cache size
  }

  /**
   * Initializes the Memory component.
   * @param {object} config - The component's configuration object.
   * @param {number} [config.cacheSize=1000] - The maximum size of the cache.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.storage.clear();
    this.cache.clear();
    this.cacheSize = config.cacheSize || this.cacheSize;
  }

  /**
   * Retrieves an item from memory, utilizing the cache.
   * @param {string} key - The key of the item to retrieve.
   * @returns {*} The item, or undefined if not found.
   */
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this._updateCache(key, value); // Mark as recently used
      return value;
    }

    const value = this.storage.get(key);
    if (value !== undefined) {
      this._updateCache(key, value);
    }
    return value;
  }

  /**
   * Stores an item in memory.
   * @param {string} key - The key of the item to store.
   * @param {*} value - The value to store.
   */
  set(key, value) {
    this.storage.set(key, value);
    this._updateCache(key, value);
  }

  /**
   * Deletes an item from memory and the cache.
   * @param {string} key - The key of the item to delete.
   * @returns {boolean} True if an item was deleted, false otherwise.
   */
  delete(key) {
    this.cache.delete(key);
    return this.storage.delete(key);
  }

  /**
   * Clears all items from memory and the cache.
   */
  clear() {
    this.storage.clear();
    this.cache.clear();
  }

  /**
   * Checks if an item exists in memory.
   * @param {string} key - The key to check.
   * @returns {boolean} True if the item exists, false otherwise.
   */
  has(key) {
    return this.cache.has(key) || this.storage.has(key);
  }

  /**
   * Private helper to update the cache and handle eviction (FIFO).
   * @param {string} key - The key of the item to cache.
   * @param {*} value - The value to cache.
   * @private
   */
  _updateCache(key, value) {
    // To re-insert a key and mark it as recently used, delete it first.
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);

    // Evict the oldest item if the cache is over size
    if (this.cache.size > this.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}

export default Memory;