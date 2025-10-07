import Component from './Component.js';
import { Cache } from './Utils.js';

class Config extends Component {
  constructor() {
    super();
    this.cache = new Cache();
    this.config = {};
  }

  async initialize(config = {}) {
    this.config = config;
    this.cache.clear();
    await super.initialize(config);
  }

  get(key, defaultValue) {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const value = key.split('.').reduce((obj, k) =>
      (obj && typeof obj === 'object' && k in obj) ? obj[k] : undefined, this.config);

    return value !== undefined ? (this.cache.set(key, value), value) : defaultValue;
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, k) => (typeof obj[k] !== 'object' || obj[k] === null) ? obj[k] = {} : obj[k], this.config);
    target[lastKey] = value;
    this.cache.clear();
  }

  merge(newConfig) {
    this.config = this._deepMerge(this.config, newConfig);
    this.cache.clear();
  }

  _deepMerge(target, source) {
    const result = { ...target };
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        result[key] = this._isObject(source[key])
          ? this._deepMerge(target[key] || {}, source[key])
          : source[key];
      });
    }
    return result;
  }

  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

export default Config;