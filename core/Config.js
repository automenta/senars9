import Component from './Component.js';
import { Cache } from './collections.js';
import { ObjectUtils } from './utilities.js';
import { STATES, DEFAULTS } from './constants.js';

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
    // Check cache first
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    // Extract value from config using dot notation
    const value = ObjectUtils.safeAccess(this.config, key, undefined);
    
    if (value !== undefined) {
      // Cache the value for future access
      this.cache.set(key, value);
      return value;
    }

    return defaultValue;
  }

  set(key, value) {
    // Parse the key using dot notation to support nested properties
    const keys = key.split('.');
    const lastKey = keys.pop();
    
    // Navigate to the correct nested object
    const target = keys.reduce((obj, k) =>
      ObjectUtils.isObject(obj[k]) ? obj[k] : (obj[k] = {}), this.config);
    
    // Set the value
    target[lastKey] = value;
    
    // Clear cache since we changed the config
    this.cache.clear();
  }

  merge(newConfig) {
    this.config = this._deepMerge(this.config, newConfig);
    this.cache.clear();
  }

  _deepMerge(target, source) {
    if (!ObjectUtils.isObject(target) || !ObjectUtils.isObject(source)) {
      return source ?? target;
    }

    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (ObjectUtils.isObject(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

export default Config;