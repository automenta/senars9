import Component from './Component.js';
import { Cache, Index, Storage, Validation, ErrorHandler, Logger, ObjectUtils, ArrayUtils, IndexManager } from './Utils.js';

class Memory extends Component {
  constructor() {
    super();
    this.storage = new Storage();
    this.cache = new Cache();
    this._cacheSize = 1000;
    this.focusSets = new Map();
    this.currentFocus = null;
    this.focusSize = 50;
    this.indexes = new IndexManager();
  }

  async _doInitialize(config = {}) {
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
    Validation.ensureCondition(!this.focusSets.has(name), `Focus set '${name}' already exists`);
    this.focusSets.set(name, {
      items: new Map(),
      maxSize,
      accessCount: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      attentionScore: 0,
      decayFactor: 0.9 // Attention decay over time
    });
  }

  setFocus(name) {
    Validation.ensureCondition(this.focusSets.has(name), `Focus set '${name}' does not exist`);
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

    // Enhanced sorting with attention scoring
    return ArrayUtils.sortBy(Array.from(focusSet.items.entries()), ([, data]) => [
      -(data.priority || 0), // Primary: priority (higher first)
      data.timestamp,        // Secondary: recency (newer first)
      -(data.accessCount || 0) // Tertiary: access frequency (higher first)
    ], 'asc')
      .slice(0, count)
      .map(([key, value]) => {
        value.accessCount = (value.accessCount || 0) + 1;
        return [key, value];
      });
  }

  query(criteria = {}) {
    const { type, tags, minPriority, limit = 100, sortBy, sortOrder = 'desc' } = criteria;
    let candidates = new Set(this.storage.keys());

    // Optimized query execution with early termination
    if (type) {
      const typeKeys = this.indexes.get(type);
      if (typeKeys.length === 0) return []; // Early return if no matches
      candidates = this._intersectKeys(candidates, typeKeys);
    }

    if (tags?.length) {
      candidates = this._intersectTags(candidates, tags);
      if (candidates.size === 0) return []; // Early return if no matches
    }

    if (minPriority !== undefined) {
      candidates = this._intersectPriority(candidates, minPriority);
      if (candidates.size === 0) return []; // Early return if no matches
    }

    // Convert to array and apply sorting/optimization
    let results = Array.from(candidates)
      .slice(0, limit)
      .map(key => [key, this.get(key)])
      .filter(([, value]) => value !== undefined);

    // Apply sorting if specified
    if (sortBy) {
      results.sort((a, b) => {
        const aVal = this._getSortValue(a[1], sortBy);
        const bVal = this._getSortValue(b[1], sortBy);
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }

    return results;
  }

  _intersectKeys(candidates, keys) {
    return this.indexes.intersect(candidates, key => keys.includes(key));
  }

  _intersectTags(candidates, tags) {
    const tagCandidates = new Set(tags.flatMap(tag => this.indexes.get(tag)));
    return this.indexes.intersect(candidates, key => tagCandidates.has(key));
  }

  _intersectPriority(candidates, minPriority) {
    const priorityKeys = new Set();
    for (let priority = minPriority; priority <= 10; priority++) {
      this.indexes.get(`priority_${priority}`).forEach(key => priorityKeys.add(key));
    }
    return this.indexes.intersect(candidates, key => priorityKeys.has(key));
  }

  _getSortValue(item, sortBy) {
    const sortMap = {
      priority: item.priority || 0,
      timestamp: item.timestamp || 0,
      accessCount: item.accessCount || 0,
      key: item.key || ''
    };
    return sortMap[sortBy] ?? 0;
  }

  // Enhanced query optimization methods
  getQueryStats() {
    return {
      totalKeys: this.storage.size(),
      cachedKeys: this.cache.size,
      focusSets: this.focusSets.size,
      indexes: this.indexes.indexes.size,
      cacheHitRate: this.cache.hitRate || 0
    };
  }

  optimizeIndexes() {
    // Remove unused indexes to save memory
    const usedTypes = new Set();

    // Collect all types from storage metadata
    for (const [key, value] of this.storage.entries()) {
      if (value._metadata) {
        const { type, tags } = value._metadata;
        if (type) usedTypes.add(type);
        if (tags) tags.forEach(tag => usedTypes.add(tag));
      }
    }

    // Clean up unused indexes
    for (const type of this.indexes.indexes.keys()) {
      if (!usedTypes.has(type) && !type.startsWith('priority_')) {
        this.indexes.indexes.delete(type);
      }
    }
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
    tags?.forEach(tag => this.indexes.add(tag, key));
    if (priority !== undefined) this.indexes.add(`priority_${priority}`, key);
  }

  _removeFromIndexes(key) {
    // IndexManager handles cleanup automatically in remove method
    for (const [type] of this.indexes.indexes.entries()) {
      this.indexes.remove(type, key);
    }
  }

  _updateFocusSets(key, options) {
    const { focusSet, priority = 0 } = options;
    if (!focusSet || !this.focusSets.has(focusSet)) return;

    const focusData = this.focusSets.get(focusSet);
    if (focusData.items.has(key)) return;

    focusData.items.set(key, { priority, timestamp: Date.now() });
    this._evictFocusSet(focusData);
  }

  _evictFocusSet(focusData) {
    if (focusData.items.size <= focusData.maxSize) return;

    // Enhanced eviction with attention scoring
    const items = ArrayUtils.sortBy(
      Array.from(focusData.items.entries()),
      ([, data]) => this._calculateAttentionScore(data, focusData),
      'asc'
    );

    focusData.items.delete(items[0]?.[0]);
  }

  _calculateAttentionScore(itemData, focusData) {
    const now = Date.now();
    const age = now - itemData.timestamp;
    const recencyScore = Math.exp(-age / (24 * 60 * 60 * 1000)); // Decay over 24h

    const priorityScore = (itemData.priority || 0) / 10;
    const frequencyScore = Math.min((itemData.accessCount || 0) / 100, 1);
    const focusAttention = focusData.attentionScore || 0;

    return (priorityScore * 0.4) + (recencyScore * 0.3) + (frequencyScore * 0.2) + (focusAttention * 0.1);
  }

  updateFocusAttention(name, delta) {
    const focusSet = this.focusSets.get(name);
    if (focusSet) {
      focusSet.attentionScore = Math.max(0, Math.min(1, (focusSet.attentionScore || 0) + delta));
    }
  }

  getFocusSetStats() {
    const stats = {};
    this.focusSets.forEach((data, name) => {
      stats[name] = {
        size: data.items.size,
        maxSize: data.maxSize,
        accessCount: data.accessCount,
        attentionScore: data.attentionScore,
        utilization: data.items.size / data.maxSize,
        age: Date.now() - data.createdAt
      };
    });
    return stats;
  }

  _removeFromFocusSets(key) {
    this.focusSets.forEach(focusData => focusData.items.delete(key));
  }
}

export default Memory;