import Component from './Component.js';
import { Cache, Index, Storage } from './Utils.js';

class Memory extends Component {
  constructor() {
    super();
    this.storage = new Storage();
    this.cache = new Cache();
    this._cacheSize = 1000;

    this.focusSets = new Map();
    this.currentFocus = null;
    this.focusSize = 50;

    this.indexes = new Index();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.storage.clear();
    this.cache = new Cache(config.cacheSize || this._cacheSize);
    this.focusSize = config.focusSize || this.focusSize;
    this.currentFocus = config.defaultFocus || null;
    this.focusSets.clear();
    this.indexes.clear();
  }


  get(key) {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const value = this.storage.get(key);
    if (value !== undefined) this.cache.set(key, value);
    return value;
  }

  set(key, value, options = {}) {
    this.storage.set(key, value);
    this.cache.set(key, value);
    this._updateIndexes(key, options);
    this._updateFocusSets(key, options);
  }

  delete(key) {
    if (!this.storage.has(key)) return false;
    this.cache.delete(key);
    this.storage.delete(key);
    this._removeFromIndexes(key);
    this._removeFromFocusSets(key);
    return true;
  }

  clear() {
    this.storage.clear();
    this.cache.clear();
    this.indexes.clear();
    this.focusSets.clear();
    this.currentFocus = null;
  }

  has(key) {
    return this.cache.has(key) || this.storage.has(key);
  }

  createFocusSet(name, maxSize = this.focusSize) {
    if (this.focusSets.has(name)) throw new Error(`Focus set '${name}' already exists`);
    this.focusSets.set(name, {
      items: new Map(),
      maxSize,
      accessCount: 0,
      lastAccessed: Date.now()
    });
  }

  setFocus(name) {
    if (!this.focusSets.has(name)) throw new Error(`Focus set '${name}' does not exist`);
    this.currentFocus = name;
  }

  getCurrentFocus() {
    return this.currentFocus;
  }

  getFocusItems(count = 10) {
    const focusSet = this.focusSets.get(this.currentFocus);
    if (!focusSet) return [];

    focusSet.lastAccessed = Date.now();
    focusSet.accessCount++;

    return Array.from(focusSet.items.entries())
      .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0) || b[1].timestamp - a[1].timestamp)
      .slice(0, count);
  }

  query(criteria = {}) {
    const { type, tags, minPriority, limit = 100 } = criteria;
    let candidates = new Set(this.storage.keys());

    if (type) {
      const typeKeys = this.indexes.get(type);
      candidates = new Set([...candidates].filter(key => typeKeys.includes(key)));
    }

    if (tags?.length) {
      const tagCandidates = new Set();
      tags.forEach(tag => {
        this.indexes.get(tag).forEach(key => tagCandidates.add(key));
      });
      candidates = new Set([...candidates].filter(key => tagCandidates.has(key)));
    }

    if (minPriority !== undefined) {
      const priorityCandidates = new Set();
      for (let priority = minPriority; priority <= 10; priority++) {
        this.indexes.get(`priority_${priority}`).forEach(key => priorityCandidates.add(key));
      }
      candidates = new Set([...candidates].filter(key => priorityCandidates.has(key)));
    }

    return Array.from(candidates)
      .slice(0, limit)
      .map(key => [key, this.get(key)])
      .filter(([, value]) => value !== undefined);
  }

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
      storageSize: this.storage.size(),
      cacheSize: this.cache.cache.size,
      cacheMaxSize: this.cache.maxSize,
      focusSets: focusSetStats,
      indexes: this.indexes.indexes.size
    };
  }

  _updateIndexes(key, options) {
    const { type, tags, priority } = options;

    if (type) this.indexes.add(type, key);
    if (tags?.forEach) tags.forEach(tag => this.indexes.add(tag, key));
    if (priority !== undefined) this.indexes.add(`priority_${priority}`, key);
  }

  _removeFromIndexes(key) {
    // This would need to be enhanced in the Index class to support removal by key across all types
    // For now, we'll implement a simple version
    for (const [type, keys] of this.indexes.indexes.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.indexes.indexes.delete(type);
        }
      }
    }
  }

  _updateFocusSets(key, options) {
    const { focusSet, priority = 0 } = options;
    if (!focusSet || !this.focusSets.has(focusSet)) return;

    const focusData = this.focusSets.get(focusSet);
    if (focusData.items.has(key)) return;

    focusData.items.set(key, { priority, timestamp: Date.now() });

    if (focusData.items.size > focusData.maxSize) {
      const items = Array.from(focusData.items.entries())
        .sort((a, b) => a[1].priority - b[1].priority);
      focusData.items.delete(items[0][0]);
    }
  }

  _removeFromFocusSets(key) {
    this.focusSets.forEach(focusData => focusData.items.delete(key));
  }
}

export default Memory;