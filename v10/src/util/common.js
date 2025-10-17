export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const normalize = (value, max) => Math.min(value / max, 1);

export const calculateAverage = (values) => 
  values.length === 0 ? 0 : values.reduce((sum, val) => sum + val, 0) / values.length;

export const sortByPriority = (items) => 
  [...items].sort((a, b) => b.priority - a.priority);

export const filterByMinValue = (items, minValue, valueFn) =>
  items.filter(item => valueFn(item) >= minValue);

export const findByTerm = (items, term) =>
  items.find(item => item.term?.equals(term));

export const groupByType = (items) =>
  items.reduce((groups, item) => {
    const type = item.type || 'unknown';
    return { ...groups, [type]: [...(groups[type] || []), item] };
  }, {});

export const applyToAll = (items, fn) => items.forEach(fn);

export const safeExecute = (fn, ...args) => {
  try { return fn(...args); } catch (error) { return null; }
};

export const createMap = (items, keyFn, valueFn = x => x) =>
  items.reduce((map, item) => (map.set(keyFn(item), valueFn(item)), map), new Map());

export const createSet = (items, keyFn = x => x) =>
  new Set(items.map(keyFn));

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = (fn, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    now - lastCall >= delay && (lastCall = now, fn(...args));
  };
};