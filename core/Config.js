/**
 * @file: core/Config.js
 * @description: Manages hierarchical configuration data with support for caching, validation, and deep merging.
 * @module Config
 */

import Component from './Component.js';

class Config extends Component {
  constructor() {
    super();
    this.cache = new Map();
    this.config = {};
  }

  /**
   * Initializes the configuration system with a default config.
   * @param {object} initialConfig - The initial configuration object.
   * @returns {Promise<void>}
   */
  async initialize(initialConfig = {}) {
    this.config = initialConfig;
    this.cache.clear();
    await super.initialize(initialConfig);
  }

  /**
   * Retrieves a configuration value using dot notation.
   * @param {string} key - The key of the config value (e.g., 'core.cycleIntervalMs').
   * @param {*} defaultValue - The value to return if the key is not found.
   * @returns {*} The configuration value.
   */
  get(key, defaultValue = undefined) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value === null || typeof value !== 'object' || !k in value) {
        return defaultValue;
      }
      value = value[k];
    }

    if (value !== undefined) {
      this.cache.set(key, value);
    }

    return value === undefined ? defaultValue : value;
  }

  /**
   * Sets a configuration value using dot notation.
   * @param {string} key - The key of the config value to set.
   * @param {*} value - The new value.
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (typeof current[k] !== 'object' || current[k] === null) {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
    this.cache.clear(); // Invalidate cache on any write
  }

  /**
   * Deeply merges a new configuration object into the existing one.
   * @param {object} newConfig - The new configuration to merge.
   */
  merge(newConfig) {
    this.config = this._deepMerge(this.config, newConfig);
    this.cache.clear(); // Invalidate cache on merge
  }

  /**
   * Helper function for deep merging objects.
   * @param {object} target - The target object.
   * @param {object} source - The source object.
   * @returns {object} The merged object.
   * @private
   */
  _deepMerge(target, source) {
    const output = { ...target };
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  /**
   * Checks if a variable is a non-null object.
   * @param {*} item - The item to check.
   * @returns {boolean}
   * @private
   */
  _isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
}

export default Config;