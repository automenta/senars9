/**
 * Data structure utilities for SeNARS
 */

class Cache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    const value = this.cache.get(key);
    value !== undefined && this._touch(key, value);
    return value;
  }

  set(key, value) {
    this._touch(key, value);
    this._evict();
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }

  _touch(key, value) {
    this.cache.delete(key);
    this.cache.set(key, value);
  }

  _evict() {
    this.cache.size > this.maxSize && this.cache.delete(this.cache.keys().next().value);
  }
}

class Storage {
  constructor(options = {}) {
    this.data = new Map();
    this.maxSize = options.maxSize || 1000;
    this.enableEvents = options.enableEvents !== false;
    this.eventTarget = options.eventTarget || null;
    this.namespace = options.namespace || 'storage';
  }

  get(key) {
    const value = this.data.get(key);
    if (this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:accessed`, { key, value, action: 'get' });
    }
    return value;
  }

  set(key, value) {
    const previousValue = this.data.get(key);
    this.data.set(key, value);

    // Enforce max size limit
    if (this.data.size > this.maxSize) {
      const firstKey = this.data.keys().next().value;
      this.data.delete(firstKey);
    }

    if (this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:changed`, {
        key,
        value,
        previousValue,
        action: 'set'
      });
    }
  }

  delete(key) {
    const deleted = this.data.delete(key);
    if (deleted && this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:changed`, {
        key,
        action: 'delete'
      });
    }
    return deleted;
  }

  has(key) {
    return this.data.has(key);
  }

  clear() {
    this.data.clear();
    if (this.enableEvents && this.eventTarget) {
      this.eventTarget.emit(`${this.namespace}:cleared`, {});
    }
  }

  size() {
    return this.data.size;
  }

  keys() {
    return this.data.keys();
  }

  values() {
    return this.data.values();
  }

  entries() {
    return this.data.entries();
  }

  // Enhanced methods for better functionality
  getOrDefault(key, defaultValue) {
    return this.has(key) ? this.get(key) : defaultValue;
  }

  update(key, updateFn) {
    const currentValue = this.get(key);
    const newValue = updateFn(currentValue);
    this.set(key, newValue);
    return newValue;
  }

  // Bulk operations
  setMany(entries) {
    entries.forEach(([key, value]) => this.set(key, value));
  }

  deleteMany(keys) {
    keys.forEach(key => this.delete(key));
  }

  // Advanced querying
  find(predicate) {
    const results = [];
    for (const [key, value] of this.entries()) {
      if (predicate(value, key)) {
        results.push({ key, value });
      }
    }
    return results;
  }

  filter(predicate) {
    const results = new Map();
    for (const [key, value] of this.entries()) {
      if (predicate(value, key)) {
        results.set(key, value);
      }
    }
    return results;
  }

  // Statistics and monitoring
  getStats() {
    return {
      size: this.size(),
      maxSize: this.maxSize,
      utilization: this.size() / this.maxSize,
      namespace: this.namespace
    };
  }
}

class IndexManager {
  constructor() {
    this.indexes = new Map();
  }

  add(type, key, value) {
    if (!this.indexes.has(type)) {
      this.indexes.set(type, new Set());
    }
    this.indexes.get(type).add(key);
  }

  remove(type, key) {
    if (!this.indexes.has(type)) return;
    const keys = this.indexes.get(type);
    keys.delete(key);
    if (keys.size === 0) {
      this.indexes.delete(type);
    }
  }

  get(type) {
    return this.indexes.has(type) ? Array.from(this.indexes.get(type)) : [];
  }

  has(type, key) {
    return this.indexes.has(type) && this.indexes.get(type).has(key);
  }

  clear() {
    this.indexes.clear();
  }

  // Advanced filtering operations
  intersect(candidates, filterFn) {
    return new Set([...candidates].filter(filterFn));
  }

  union(...sets) {
    return new Set(sets.flatMap(set => [...set]));
  }

  difference(setA, setB) {
    return new Set([...setA].filter(item => !setB.has(item)));
  }
}

export { Cache, Storage, IndexManager };