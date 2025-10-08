class Logger {
  static log = (level, message, data = {}) => (console[level] || console.log)(`[${level.toUpperCase()}]`, message, data);
  static info = (msg, data) => Logger.log('info', msg, data);
  static warn = (msg, data) => Logger.log('warn', msg, data);
  static error = (msg, data) => Logger.log('error', msg, data);
  static debug = (msg, data) => Logger.log('debug', msg, data);
}

class ObjectUtils {
  static safeAccess(obj, path, defaultValue) {
    return path.split('.').reduce((current, key) =>
      (current && typeof current === 'object' && key in current) ? current[key] : undefined, obj) ?? defaultValue;
  }

  static deepClone = obj => obj && typeof obj === 'object' ? JSON.parse(JSON.stringify(obj)) : obj;

  static isObject = item => item && typeof item === 'object' && !Array.isArray(item);
  static isEmpty = obj => !obj || Object.keys(obj).length === 0;
  static pick = (obj, keys) => keys.reduce((result, key) => (key in obj && (result[key] = obj[key]), result), {});
  static omit = (obj, keys) => Object.keys(obj).reduce((result, key) => (!keys.includes(key) && (result[key] = obj[key]), result), {});
}

class ArrayUtils {
  static groupBy = (array, keyFn) => array.reduce((groups, item) => ((groups[keyFn(item)] ||= []).push(item), groups), {});

  static sortBy = (array, keyFn, direction = 'asc') => [...array].sort((a, b) => {
    const aVal = keyFn(a), bVal = keyFn(b);
    return direction === 'desc' ? (bVal < aVal ? -1 : bVal > aVal ? 1 : 0) : (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
  });

  static unique = (array, keyFn) => keyFn
    ? [...ArrayUtils.groupBy(array, keyFn)].map(([, group]) => group[0])
    : [...new Set(array)];

  static compact = array => array.filter(Boolean);
  static flatten = (array, depth = 1) => array.flat(depth);
}

class IdGenerator {
  static generate(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}-${random}`;
  }

  static generateErrorId() {
    return this.generate('err_');
  }

  static generateMessageId() {
    return this.generate('msg_');
  }
}

export { Logger, ObjectUtils, ArrayUtils, IdGenerator };