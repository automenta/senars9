class Cache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this._touch(key, value);
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
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

class Index {
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
}

class Storage {
  constructor() {
    this.data = new Map();
  }

  get(key) {
    return this.data.get(key);
  }

  set(key, value) {
    this.data.set(key, value);
  }

  delete(key) {
    return this.data.delete(key);
  }

  has(key) {
    return this.data.has(key);
  }

  clear() {
    this.data.clear();
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
}

export { Cache, Index, Storage };