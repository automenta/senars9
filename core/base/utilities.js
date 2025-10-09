class Logger {
  static log(level, message, data = {}) {
    const method = console[level] || console.log;
    // Call the method to allow spies to work during tests, but don't return the result in test mode
    const result = method(`[${level?.toUpperCase() || 'LOG'}]`, message, data);
    // Don't return the result in test mode to keep tests silent on success
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
      return undefined;
    }
    return result;
  }

  static info = (msg, data) =>
    (process.env.NODE_ENV === 'development' || process.env.DEBUG) && Logger.log('info', msg, data);

  static warn = (msg, data) => Logger.log('warn', msg, data);
  static error = (msg, data) => Logger.log('error', msg, data);
  static debug = (msg, data) =>
    process.env.NODE_ENV === 'development' && Logger.log('debug', msg, data);
}

class ObjectUtils {
  static safeAccess(obj, path, defaultValue) {
    if (!obj || typeof path !== 'string') return defaultValue;
    
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj) ?? defaultValue;
  }

  static deepClone(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => ObjectUtils.deepClone(item));
    if (obj instanceof Object) return Object.keys(obj).reduce((cloned, key) => {
      cloned[key] = ObjectUtils.deepClone(obj[key]);
      return cloned;
    }, {});
    return obj;
  }

  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  static isEmpty(obj) {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (ObjectUtils.isObject(obj)) return Object.keys(obj).length === 0;
    return false;
  }

  static pick(obj, keys) {
    if (!obj || !Array.isArray(keys)) return {};
    return keys.reduce((result, key) => {
      if (key in obj) result[key] = obj[key];
      return result;
    }, {});
  }

  static omit(obj, keys) {
    if (!obj || !Array.isArray(keys)) return obj || {};
    return Object.keys(obj).reduce((result, key) => {
      if (!keys.includes(key)) result[key] = obj[key];
      return result;
    }, {});
  }

  static mapKeys(obj, keyMapper) {
    if (!obj || typeof keyMapper !== 'function') return obj || {};
    return Object.keys(obj).reduce((result, key) => {
      result[keyMapper(key)] = obj[key];
      return result;
    }, {});
  }

  static filterValues(obj, predicate) {
    if (!obj || typeof predicate !== 'function') return obj || {};
    return Object.keys(obj).reduce((result, key) => {
      if (predicate(obj[key], key)) result[key] = obj[key];
      return result;
    }, {});
  }

  static mergeDeep(target, source) {
    if (!source) return target;
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (ObjectUtils.isObject(source[key]) && ObjectUtils.isObject(target[key])) {
          result[key] = ObjectUtils.mergeDeep(target[key], source[key]);
        } else {
          result[key] = ObjectUtils.deepClone(source[key]);
        }
      }
    }
    
    return result;
  }
}

class ArrayUtils {
  static groupBy(array, keyFn) {
    if (!Array.isArray(array) || typeof keyFn !== 'function') return {};
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      (groups[key] = groups[key] || []).push(item);
      return groups;
    }, {});
  }

  static sortBy(array, keyFn, direction = 'asc') {
    if (!Array.isArray(array)) return array || [];
    
    const sortedArray = [...array];
    return sortedArray.sort((a, b) => {
      const aVal = keyFn(a);
      const bVal = keyFn(b);
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  static unique(array, keyFn) {
    if (!Array.isArray(array)) return array || [];
    
    if (keyFn) {
      const seen = new Set();
      const result = [];
      for (const item of array) {
        const key = keyFn(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }
    
    return [...new Set(array)];
  }

  static compact(array) {
    if (!Array.isArray(array)) return array || [];
    return array.filter(Boolean);
  }

  static flatten(array, depth = 1) {
    if (!Array.isArray(array)) return array || [];
    return array.flat(depth);
  }

  static partition(array, predicate) {
    if (!Array.isArray(array) || typeof predicate !== 'function') return [array || [], []];
    return array.reduce(([truthy, falsy], item) => {
      (predicate(item) ? truthy : falsy).push(item);
      return [truthy, falsy];
    }, [[], []]);
  }

  static countBy(array, keyFn) {
    if (!Array.isArray(array) || typeof keyFn !== 'function') return {};
    return array.reduce((counts, item) => {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }
}

class IdGenerator {
  static generate(prefix = '') {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateErrorId = () => IdGenerator.generate('err_');
  static generateMessageId = () => IdGenerator.generate('msg_');

  static calculateBackoffDelay(baseDelay, attempt, multiplier = 2) {
    return baseDelay * Math.pow(multiplier, attempt);
  }
}

export { Logger, ObjectUtils, ArrayUtils, IdGenerator };