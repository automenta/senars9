import Component from './Component.js';
import { Cache, Storage, IndexManager } from './collections.js';
import { Logger, ObjectUtils, ArrayUtils } from './utilities.js';
import { Validation } from './validation.js';
import { DEFAULTS } from './constants.js';

class Focus {
  constructor() {
    this.focusSets = new Map();
    this.currentFocus = null;
    this.focusSize = DEFAULTS.FOCUS_SIZE;
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
      decayFactor: DEFAULTS.ATTENTION_DECAY
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

    return ArrayUtils.sortBy(Array.from(focusSet.items.entries()), ([, data]) => [
      -(data.priority || 0),
      data.timestamp,
      -(data.accessCount || 0)
    ], 'asc')
      .slice(0, count)
      .map(([key, value]) => (value.accessCount = (value.accessCount || 0) + 1, [key, value]));
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

  updateFocusSets(key, options) {
    const { focusSet, priority = 0 } = options;
    if (!focusSet || !this.focusSets.has(focusSet)) return;

    const focusData = this.focusSets.get(focusSet);
    if (focusData.items.has(key)) return;

    focusData.items.set(key, { priority, timestamp: Date.now() });
    if (focusData.items.size > focusData.maxSize) {
      const firstKey = focusData.items.keys().next().value;
      focusData.items.delete(firstKey);
    }
  }

  removeFromFocusSets(key) {
    this.focusSets.forEach(focusData => focusData.items.delete(key));
  }

  clear() {
    this.focusSets.clear();
    this.currentFocus = null;
  }
}

class Memory extends Component {
  constructor() {
    super();
    this.storage = new Storage();
    this.cache = new Cache(DEFAULTS.CACHE_SIZE);
    this.focus = new Focus();
    this.indexes = new IndexManager();
  }

  async _doInitialize(config = {}) {
    this.storage.clear();
    if (config.cacheSize) {
      this.cache = new Cache(config.cacheSize);
    }
    this.focus.focusSize = config.focusSize || DEFAULTS.FOCUS_SIZE;
    this.focus.currentFocus = config.defaultFocus || null;
    this.focus.focusSets.clear();
    this.indexes.clear();
  }

  get(key) {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const value = this.storage.get(key);
    return value !== undefined ? (this.cache.set(key, value), value) : undefined;
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
    this.focus.clear();
  }

  has(key) {
    return this.cache.has(key) || this.storage.has(key);
  }

  createFocusSet(name, maxSize = this.focus.focusSize) {
    this.focus.createFocusSet(name, maxSize);
  }

  setFocus(name) {
    this.focus.setFocus(name);
  }

  getCurrentFocus() {
    return this.focus.getCurrentFocus();
  }

  getFocusItems(count = 10) {
    return this.focus.getFocusItems(count);
  }

  query(criteria = {}) {
    const { type, tags, minPriority, limit = DEFAULTS.QUERY_LIMIT, sortBy, sortOrder = 'desc' } = criteria;
    let candidates = new Set(this.storage.keys());

    if (type) {
      const typeKeys = this.indexes.get(type);
      if (typeKeys.length === 0) return [];
      candidates = this._intersectKeys(candidates, typeKeys);
    }

    if (tags?.length) {
      candidates = this._intersectTags(candidates, tags);
      if (candidates.size === 0) return [];
    }

    if (minPriority !== undefined) {
      candidates = this._intersectPriority(candidates, minPriority);
      if (candidates.size === 0) return [];
    }

    let results = Array.from(candidates)
      .slice(0, limit)
      .map(key => [key, this.get(key)])
      .filter(([, value]) => value !== undefined);

    if (sortBy) {
      const sortFn = sortOrder === 'desc'
        ? (a, b) => this._getSortValue(b[1], sortBy) - this._getSortValue(a[1], sortBy)
        : (a, b) => this._getSortValue(a[1], sortBy) - this._getSortValue(b[1], sortBy);
      results.sort(sortFn);
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
    for (let priority = minPriority; priority <= DEFAULTS.PRIORITY_LEVELS; priority++) {
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

  getQueryStats() {
    return {
      totalKeys: this.storage.size(),
      cachedKeys: this.cache.size,
      focusSets: this.focus.focusSets.size,
      indexes: this.indexes.indexes.size,
      cacheHitRate: this.cache.hitRate || 0
    };
  }

  optimizeIndexes() {
    const usedTypes = new Set();
    for (const [key, value] of this.storage.entries()) {
      if (value._metadata) {
        const { type, tags } = value._metadata;
        if (type) usedTypes.add(type);
        if (tags) tags.forEach(tag => usedTypes.add(tag));
      }
    }

    for (const type of this.indexes.indexes.keys()) {
      if (!usedTypes.has(type) && !type.startsWith('priority_')) {
        this.indexes.indexes.delete(type);
      }
    }
  }

  getStats() {
    return {
      storageSize: this.storage.size(),
      cacheSize: this.cache.cache.size,
      cacheMaxSize: this.cache.maxSize,
      focusSets: this.focus.getFocusSetStats(),
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
    this.focus.updateFocusSets(key, options);
  }


  _calculateAttentionScore(itemData, focusData) {
    const now = Date.now();
    const age = now - itemData.timestamp;
    const recencyScore = Math.exp(-age / (DEFAULTS.DECAY_HOURS * 60 * 60 * 1000));

    const priorityScore = (itemData.priority || 0) / DEFAULTS.PRIORITY_LEVELS;
    const frequencyScore = Math.min((itemData.accessCount || 0) / DEFAULTS.ACCESS_WEIGHT, 1);
    const focusAttention = focusData.attentionScore || 0;

    const PRIORITY_WEIGHT = 0.4;
    const RECENCY_WEIGHT = 0.3;
    const FREQUENCY_WEIGHT = 0.2;
    const FOCUS_WEIGHT = 0.1;

    return (priorityScore * PRIORITY_WEIGHT) + (recencyScore * RECENCY_WEIGHT) + (frequencyScore * FREQUENCY_WEIGHT) + (focusAttention * FOCUS_WEIGHT);
  }

  updateFocusAttention(name, delta) {
    this.focus.updateFocusAttention(name, delta);
  }

  getFocusSetStats() {
    return this.focus.getFocusSetStats();
  }

  _removeFromFocusSets(key) {
    this.focus.removeFromFocusSets(key);
  }
}

export default Memory;