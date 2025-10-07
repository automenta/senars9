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

class Retry {
  static async execute(fn, options = {}) {
    const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = options;
    let lastError;

    if (maxRetries === 0) return fn();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) console.log(`Operation succeeded after ${attempt} retries`);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  static withHandler(errorHandler) {
    return {
      async execute(fn, options = {}) {
        try {
          return await Retry.execute(fn, options);
        } catch (error) {
          return errorHandler(error);
        }
      }
    };
  }
}

class Validation {
  static requireProps(obj, props) {
    if (!obj) throw new Error('Object is required');
    props.forEach(prop => {
      if (!obj[prop]) throw new Error(`${prop} is required`);
    });
  }

  static validateType(value, type, name) {
    if (typeof value !== type) {
      throw new Error(`${name} must be ${type}, got ${typeof value}`);
    }
  }

  static validateFunction(fn, name) {
    this.validateType(fn, 'function', name);
  }

  static validateTool(tool) {
    this.requireProps(tool, ['id']);
    this.validateFunction(tool.execute, 'tool.execute');
  }

  static validatePlugin(plugin) {
    this.requireProps(plugin, ['id']);
    this.validateFunction(plugin.install, 'plugin.install');
  }

  static ensureExists(item, name, type = 'Item') {
    if (!item) throw new Error(`${type} "${name}" not found.`);
    return item;
  }

  static ensureCondition(condition, message) {
    if (!condition) throw new Error(message);
  }

  static ensure(condition, message = 'Validation failed') {
    return this.ensureCondition(condition, message);
  }
}

class ErrorHandler {
  static handle(error, context = '') {
    const errorInfo = { error: error.message, stack: error.stack, context };
    console.error('Handled error:', errorInfo);
    return errorInfo;
  }

  static async withErrorHandling(fn, context = '') {
    try {
      return await fn();
    } catch (error) {
      return this.handle(error, context);
    }
  }
}

export { Cache, Index, Storage, Retry, Validation, ErrorHandler };