import { Logger, IdGenerator } from './utilities.js';
import { DEFAULTS, RETRYABLE_ERRORS } from './constants.js';

class Validation {
  static requireProps(obj, props) {
    if (!obj) throw new Error('Object is required');
    props.forEach(prop => {
      if (!obj[prop]) throw new Error(`${prop} is required`);
    });
  }

  static validateType(value, type, name) {
    if (typeof value !== type) {
      throw new Error(`${name} must be ${type}, got ${typeof value}`);
    }
  }

  static validateFunction(fn, name) {
    this.validateType(fn, 'function', name);
  }

  static validateTool(tool) {
    this.requireProps(tool, ['id']);
    this.validateFunction(tool.execute, 'tool.execute');
  }

  static validatePlugin(plugin) {
    this.requireProps(plugin, ['id']);
    this.validateFunction(plugin.install, 'plugin.install');
  }

  static ensureExists(item, name, type = 'Item') {
    if (!item) throw new Error(`${type} "${name}" not found.`);
    return item;
  }

  static ensureCondition(condition, message) {
    if (!condition) throw new Error(message);
  }

  static ensure(condition, message = 'Validation failed') {
    return this.ensureCondition(condition, message);
  }
}

class ErrorHandler {
  static handle(error, context = '', messagesComponent = null) {
    const errorInfo = {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      errorId: this._generateErrorId()
    };

    messagesComponent ? messagesComponent.emit('error:occurred', {
      error: errorInfo.error,
      errorId: errorInfo.errorId,
      context,
      stack: errorInfo.stack,
      timestamp: errorInfo.timestamp
    }) : Logger.error('Handled error', errorInfo);

    return errorInfo;
  }

  static async withErrorHandling(fn, context = '', messagesComponent = null) {
    try {
      return await fn();
    } catch (error) {
      return this.handle(error, context, messagesComponent);
    }
  }

  static createEnhanced(error, context = {}) {
    const enhanced = new Error(`${context.type || 'Error'}: ${error.message}`);
    enhanced.originalError = error;
    enhanced.context = context;
    enhanced.timestamp = new Date().toISOString();
    enhanced.errorId = this._generateErrorId();
    return enhanced;
  }

  static _generateErrorId() {
    return IdGenerator.generateErrorId();
  }

  static createErrorBoundary(componentName, messagesComponent = null) {
    return {
      wrap: (fn) => async (...args) => {
        try {
          return await fn.apply(this, args);
        } catch (error) {
          const enhancedError = this.createEnhanced(error, {
            component: componentName,
            type: 'ComponentError'
          });
          return this.handle(enhancedError, componentName, messagesComponent);
        }
      },

      wrapMethod: (obj, methodName) => {
        const originalMethod = obj[methodName];
        if (typeof originalMethod !== 'function') {
          throw new Error(`${methodName} is not a function`);
        }

        obj[methodName] = async function(...args) {
          try {
            return await originalMethod.apply(this, args);
          } catch (error) {
            const enhancedError = ErrorHandler.createEnhanced(error, {
              component: componentName,
              method: methodName,
              type: 'MethodError'
            });
            return ErrorHandler.handle(enhancedError, `${componentName}.${methodName}`, messagesComponent);
          }
        };
      }
    };
  }
}



class Retry {
  static async execute(fn, options = {}) {
    const { maxRetries = DEFAULTS.MAX_RETRIES, retryDelay = DEFAULTS.RETRY_DELAY, backoffMultiplier = DEFAULTS.BACKOFF_MULTIPLIER } = options;
    let lastError;

    if (maxRetries === 0) return fn();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        attempt > 0 && Logger.debug(`Operation succeeded after ${attempt} retries`);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  static withHandler(errorHandler) {
    return {
      async execute(fn, options = {}) {
        try {
          return await Retry.execute(fn, options);
        } catch (error) {
          return errorHandler(error);
        }
      }
    };
  }

  static async withErrorHandling(fn, context = '', messagesComponent = null) {
    try {
      return await fn();
    } catch (error) {
      const errorInfo = {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        errorId: this._generateErrorId()
      };

      messagesComponent ? messagesComponent.emit('error:occurred', {
        error: errorInfo.error,
        errorId: errorInfo.errorId,
        context,
        stack: errorInfo.stack,
        timestamp: errorInfo.timestamp
      }) : Logger.error('Handled error', errorInfo);

      throw error;
    }
  }
}

export { Validation, ErrorHandler, Retry };