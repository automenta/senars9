export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const normalize = (value, max) => Math.min(value / max, 1);

export const calculateAverage = (values) => values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;

export const sortByPriority = (items) => [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));

export const filterByMinValue = (items, minValue, valueFn) => items.filter(item => valueFn(item) >= minValue);

export const findByTerm = (items, term) => items.find(item => item.term?.equals(term));

export const groupByType = (items) => items.reduce((groups, item) => {
    const type = item.type || 'unknown';
    const group = groups[type] || [];
    return {...groups, [type]: [...group, item]};
}, {});

export const applyToAll = (items, fn) => items.forEach(fn);

export const safeExecute = (fn, ...args) => {
    try {
        return fn(...args);
    } catch (error) {
        return null;
    }
};

export const createMap = (items, keyFn, valueFn = x => x) => 
    items.reduce((map, item) => map.set(keyFn(item), valueFn(item)) || map, new Map());

export const createSet = (items, keyFn = x => x) => new Set(items.map(keyFn));

export const debounce = (func, wait) => {
    let timeoutId = null;

    const debouncedFunc = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), wait);
    };

    debouncedFunc.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debouncedFunc;
};

export const throttle = (fn, delay) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    };
};

export const collectTasksFromAllConcepts = (memory, filterFn = null) => {
    const allTasks = [];
    for (const concept of memory.getAllConcepts()) {
        const tasks = filterFn ? concept.getAllTasks().filter(filterFn) : concept.getAllTasks();
        allTasks.push(...tasks);
    }
    return allTasks;
};

export const freezeObject = Object.freeze;

export const clampAndFreeze = (obj, min = 0, max = 1) => {
    if (typeof obj === 'number') return clamp(obj, min, max);
    
    const clamped = {...obj};
    for (const [key, value] of Object.entries(clamped)) {
        if (typeof value === 'number') clamped[key] = clamp(value, min, max);
    }
    return freezeObject(clamped);
};