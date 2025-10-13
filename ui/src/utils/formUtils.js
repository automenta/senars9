/**
 * Form utilities for validation and input handling
 */

/**
 * Validates a task input based on common rules
 */
export const validateTask = (task) => {
  const errors = [];
  
  if (!task?.content || task.content.trim().length === 0) {
    errors.push('Task content is required');
  }
  
  if (task.content && task.content.length > 500) {
    errors.push('Task content is too long (max 500 characters)');
  }
  
  if (task.priority !== undefined && (task.priority < 0 || task.priority > 1)) {
    errors.push('Priority must be between 0 and 1');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a concept input
 */
export const validateConcept = (concept) => {
  const errors = [];
  
  if (!concept?.name || concept.name.trim().length === 0) {
    errors.push('Concept name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Common input change handlers
 */
export const inputHandlers = {
  handleNumericChange: (e, setter, min = null, max = null) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      if (min !== null && value < min) setter(min);
      else if (max !== null && value > max) setter(max);
      else setter(value);
    } else if (e.target.value === '') {
      setter(min || 0); // Reset to min value if empty
    }
  },
  
  handleStringChange: (e, setter) => {
    setter(e.target.value);
  },
  
  handleToggleChange: (e, setter) => {
    setter(e.target.checked);
  }
};

/**
 * Debounce utility for input handling
 */
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};