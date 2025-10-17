class ObjectUtils {
  static safeAccess(obj, path, defaultValue) {
    if (!obj || typeof path !== 'string') return defaultValue;

    return path.split('.').reduce((current, key) =>
      current && typeof current === 'object' && key in current ? current[key] : undefined, obj
    ) ?? defaultValue;
  }

  static deepClone(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => ObjectUtils.deepClone(item));
    if (obj instanceof Object) {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = ObjectUtils.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  static isEmpty(obj) {
    return !obj || (Array.isArray(obj) && obj.length === 0) || 
           (ObjectUtils.isObject(obj) && Object.keys(obj).length === 0);
  }

  static pick(obj, keys) {
    return !obj || !Array.isArray(keys) ? {} :
           Object.fromEntries(keys.filter(key => key in obj).map(key => [key, obj[key]]));
  }

  static omit(obj, keys) {
    return !obj || !Array.isArray(keys) ? obj || {} :
           Object.fromEntries(
             Object.entries(obj).filter(([key]) => !keys.includes(key))
           );
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
    const groups = {};
    for (const item of array) {
      const key = keyFn(item);
      (groups[key] = groups[key] || []).push(item);
    }
    return groups;
  }

  static sortBy(array, keyFn, direction = 'asc') {
    return !Array.isArray(array) ? array || [] :
           [...array].sort((a, b) => {
             const aVal = keyFn(a), bVal = keyFn(b), diff = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
             return diff * (direction === 'desc' ? -1 : 1);
           });
  }

  static unique(array, keyFn) {
    return !Array.isArray(array) ? array || [] :
           keyFn ? (() => {
             const seen = new Set(), result = [];
             for (const item of array) {
               const key = keyFn(item);
               !seen.has(key) && (seen.add(key), result.push(item));
             }
             return result;
           })() :
           [...new Set(array)];
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
    const truthy = [], falsy = [];
    for (const item of array) {
      (predicate(item) ? truthy : falsy).push(item);
    }
    return [truthy, falsy];
  }

  static countBy(array, keyFn) {
    if (!Array.isArray(array) || typeof keyFn !== 'function') return {};
    const counts = {};
    for (const item of array) {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
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

export { ObjectUtils, ArrayUtils, IdGenerator };