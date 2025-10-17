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
        return {...groups, [type]: [...(groups[type] || []), item]};
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
    items.reduce((map, item) => (map.set(keyFn(item), valueFn(item)), map), new Map());

export const createSet = (items, keyFn = x => x) =>
    new Set(items.map(keyFn));

export const debounce = (func, wait) => {
    let timeoutId = null;

    const debouncedFunc = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), wait);
    };

    // Add cleanup method
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
        const conceptTasks = filterFn ?
            concept.getAllTasks().filter(filterFn) :
            concept.getAllTasks();
        allTasks.push(...conceptTasks);
    }
    return allTasks;
};

export const freezeObject = (obj) => Object.freeze(obj);

export const clampAndFreeze = (obj, min = 0, max = 1) => {
    if (typeof obj === 'number') {
        return clamp(obj, min, max);
    }
    // Assuming obj has numeric properties that need clamping
    const clamped = {...obj};
    for (const key of Object.keys(clamped)) {
        if (typeof clamped[key] === 'number') {
            clamped[key] = clamp(clamped[key], min, max);
        }
    }
    return freezeObject(clamped);
};