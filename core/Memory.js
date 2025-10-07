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

    // Focus set management for attention
    this.focusSets = new Map();
    this.currentFocus = null;
    this.focusSize = 50; // Maximum items in focus

    // Query optimization indexes
    this.typeIndex = new Map(); // Index by object type
    this.tagIndex = new Map(); // Index by tags
    this.priorityIndex = new Map(); // Index by priority
  }

  /**
   * Initializes the Memory component with enhanced configuration.
   * @param {object} config - The component's configuration object.
   * @param {number} [config.cacheSize=1000] - The maximum size of the cache.
   * @param {number} [config.focusSize=50] - The maximum size of focus sets.
   * @param {string} [config.defaultFocus=null] - The default focus set name.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.storage.clear();
    this.cache.clear();
    this.cacheSize = config.cacheSize || this.cacheSize;
    this.focusSize = config.focusSize || this.focusSize;

    // Initialize focus sets
    this.focusSets.clear();
    this.currentFocus = config.defaultFocus || null;

    // Initialize indexes
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.priorityIndex.clear();
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
   * Stores an item in memory with enhanced indexing and focus management.
   * @param {string} key - The key of the item to store.
   * @param {*} value - The value to store.
   * @param {object} [options={}] - Storage options.
   * @param {string} [options.type] - The type of the item for indexing.
   * @param {Array<string>} [options.tags=[]] - Tags for the item.
   * @param {number} [options.priority=0] - Priority for focus management.
   * @param {string} [options.focusSet] - Focus set to add this item to.
   */
  set(key, value, options = {}) {
    this.storage.set(key, value);
    this._updateCache(key, value);
    this._updateIndexes(key, value, options);
    this._updateFocusSets(key, value, options);
  }

  /**
   * Deletes an item from memory, cache, indexes, and focus sets.
   * @param {string} key - The key of the item to delete.
   * @returns {boolean} True if an item was deleted, false otherwise.
   */
  delete(key) {
    const existed = this.storage.has(key);
    if (existed) {
      const value = this.storage.get(key);
      this.cache.delete(key);
      this.storage.delete(key);
      this._removeFromIndexes(key, value);
      this._removeFromFocusSets(key);
    }
    return existed;
  }

  /**
   * Clears all items from memory, cache, indexes, and focus sets.
   */
  clear() {
    this.storage.clear();
    this.cache.clear();
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.priorityIndex.clear();
    this.focusSets.clear();
    this.currentFocus = null;
  }

  /**
   * Checks if an item exists in memory.
   * @param {string} key - The key to check.
   * @returns {boolean} True if the item exists, false otherwise.
   */
  has(key) {
    return this.cache.has(key) || this.storage.has(key);
  }

  // === FOCUS SET MANAGEMENT ===

  /**
   * Creates a new focus set for attention management.
   * @param {string} name - The name of the focus set.
   * @param {number} [maxSize] - Maximum size of the focus set.
   */
  createFocusSet(name, maxSize = this.focusSize) {
    if (this.focusSets.has(name)) {
      throw new Error(`Focus set '${name}' already exists`);
    }
    this.focusSets.set(name, {
      items: new Map(),
      maxSize,
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Switches to a specific focus set.
   * @param {string} name - The name of the focus set to switch to.
   */
  setFocus(name) {
    if (!this.focusSets.has(name)) {
      throw new Error(`Focus set '${name}' does not exist`);
    }
    this.currentFocus = name;
  }

  /**
   * Gets the current focus set name.
   * @returns {string|null} The current focus set name or null.
   */
  getCurrentFocus() {
    return this.currentFocus;
  }

  /**
   * Gets the most relevant items from the current focus set.
   * @param {number} [count=10] - Number of items to retrieve.
   * @returns {Array} Array of key-value pairs from the focus set.
   */
  getFocusItems(count = 10) {
    if (!this.currentFocus || !this.focusSets.has(this.currentFocus)) {
      return [];
    }

    const focusSet = this.focusSets.get(this.currentFocus);
    focusSet.lastAccessed = Date.now();
    focusSet.accessCount++;

    // Sort by priority and recency
    const items = Array.from(focusSet.items.entries());
    items.sort((a, b) => {
      const [,aData] = a;
      const [,bData] = b;
      return (bData.priority || 0) - (aData.priority || 0) || bData.timestamp - aData.timestamp;
    });

    return items.slice(0, count);
  }

  // === QUERY OPTIMIZATION ===

  /**
   * Optimized query with indexing support.
   * @param {object} criteria - Query criteria.
   * @param {string} [criteria.type] - Filter by type.
   * @param {Array<string>} [criteria.tags] - Filter by tags.
   * @param {number} [criteria.minPriority] - Minimum priority.
   * @param {number} [criteria.limit=100] - Maximum results.
   * @returns {Array} Array of matching key-value pairs.
   */
  query(criteria = {}) {
    const { type, tags, minPriority, limit = 100 } = criteria;
    let candidates = new Set(this.storage.keys());

    // Use indexes for fast filtering
    if (type && this.typeIndex.has(type)) {
      candidates = new Set([...candidates].filter(key => this.typeIndex.get(type).has(key)));
    }

    if (tags && tags.length > 0) {
      const tagCandidates = new Set();
      tags.forEach(tag => {
        if (this.tagIndex.has(tag)) {
          this.tagIndex.get(tag).forEach(key => tagCandidates.add(key));
        }
      });
      candidates = new Set([...candidates].filter(key => tagCandidates.has(key)));
    }

    if (minPriority !== undefined && this.priorityIndex.has(minPriority)) {
      const priorityCandidates = new Set();
      for (let priority = minPriority; priority <= 10; priority++) {
        if (this.priorityIndex.has(priority)) {
          this.priorityIndex.get(priority).forEach(key => priorityCandidates.add(key));
        }
      }
      candidates = new Set([...candidates].filter(key => priorityCandidates.has(key)));
    }

    // Convert to array and limit results
    const results = Array.from(candidates)
      .slice(0, limit)
      .map(key => [key, this.get(key)])
      .filter(([, value]) => value !== undefined);

    return results;
  }

  /**
   * Gets memory statistics including focus sets and indexes.
   * @returns {object} Memory usage and performance statistics.
   */
  getStats() {
    const focusSetStats = {};
    this.focusSets.forEach((data, name) => {
      focusSetStats[name] = {
        size: data.items.size,
        maxSize: data.maxSize,
        accessCount: data.accessCount,
        lastAccessed: data.lastAccessed
      };
    });

    return {
      storageSize: this.storage.size,
      cacheSize: this.cache.size,
      cacheMaxSize: this.cacheSize,
      focusSets: focusSetStats,
      indexes: {
        types: this.typeIndex.size,
        tags: this.tagIndex.size,
        priorities: this.priorityIndex.size
      }
    };
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

  /**
   * Updates indexes when storing an item.
   * @private
   */
  _updateIndexes(key, value, options) {
    const { type, tags, priority } = options;

    if (type) {
      if (!this.typeIndex.has(type)) {
        this.typeIndex.set(type, new Set());
      }
      this.typeIndex.get(type).add(key);
    }

    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag).add(key);
      });
    }

    if (priority !== undefined) {
      if (!this.priorityIndex.has(priority)) {
        this.priorityIndex.set(priority, new Set());
      }
      this.priorityIndex.get(priority).add(key);
    }
  }

  /**
   * Removes item from all indexes.
   * @private
   */
  _removeFromIndexes(key, value) {
    // Remove from type index
    for (const [type, keys] of this.typeIndex.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.typeIndex.delete(type);
        }
      }
    }

    // Remove from tag index
    for (const [tag, keys] of this.tagIndex.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Remove from priority index
    for (const [priority, keys] of this.priorityIndex.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.priorityIndex.delete(priority);
        }
      }
    }
  }

  /**
   * Updates focus sets when storing an item.
   * @private
   */
  _updateFocusSets(key, value, options) {
    const { focusSet, priority = 0 } = options;

    if (focusSet && this.focusSets.has(focusSet)) {
      const focusData = this.focusSets.get(focusSet);

      // Add to focus set if not already present
      if (!focusData.items.has(key)) {
        focusData.items.set(key, {
          priority,
          timestamp: Date.now()
        });

        // Evict lowest priority item if over size
        if (focusData.items.size > focusData.maxSize) {
          const items = Array.from(focusData.items.entries());
          items.sort((a, b) => (a[1].priority || 0) - (b[1].priority || 0));
          const [evictKey] = items[0];
          focusData.items.delete(evictKey);
        }
      }
    }
  }

  /**
   * Removes item from all focus sets.
   * @private
   */
  _removeFromFocusSets(key) {
    for (const focusData of this.focusSets.values()) {
      focusData.items.delete(key);
    }
  }
}

export default Memory;