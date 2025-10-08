const STATES = { UNINITIALIZED: 'uninitialized', INITIALIZED: 'initialized', RUNNING: 'running', STOPPED: 'stopped', DESTROYED: 'destroyed' };

class Component {
  constructor() {
    this.status = STATES.UNINITIALIZED;
    this.flags = { initialized: false, started: false };
    this._eventHandlers = new Map();
  }

  async initialize(config = {}) {
    this.config = config;
    await this._doInitialize(config);
    this._setState(STATES.INITIALIZED, { initialized: true });
  }

  async _doInitialize() {}

  async start() {
    await this._doStart();
    this._setState(STATES.RUNNING, { started: true });
  }

  async _doStart() {}

  async stop() {
    await this._doStop();
    this._setState(STATES.STOPPED, { started: false });
  }

  async _doStop() {}

  async destroy() {
    await this._doDestroy();
    this._setState(STATES.DESTROYED, { initialized: false, started: false });
    this._eventHandlers.clear();
  }

  async _doDestroy() {}

  _setState(status, flags) {
    this.status = status;
    Object.assign(this.flags, flags);
  }

  getHealth() {
    return { status: 'healthy', issues: [] };
  }

  getMetrics() {
    return {};
  }

  getStatus() {
    return { status: this.status };
  }

  on(event, handler) {
    this._requireMessages().on(event, handler);
  }

  off(event, handler) {
    this._requireMessages().off(event, handler);
  }

  emit(event, data) {
    this._requireMessages().emit(event, data);
  }

  _requireMessages() {
    if (!this.core?.messages) throw new Error('Messages component not available on core.');
    return this.core.messages;
  }

  _handleError(error, context = '') {
    const errorBoundary = ErrorHandler.createErrorBoundary(this.constructor.name, this.core?.messages);
    return errorBoundary.wrap(() => { throw error })();
  }

  async _safeExecute(operation, operationName) {
    const errorBoundary = ErrorHandler.createErrorBoundary(this.constructor.name, this.core?.messages);
    const wrappedOperation = errorBoundary.wrap(operation);

    try {
      return await wrappedOperation();
    } catch (error) {
      Logger.error(`${this.constructor.name}:${operationName} failed`, {
        operation: operationName,
        error: error.message,
        component: this.constructor.name
      });
      throw error;
    }
  }

  // Enhanced lifecycle methods that use Messages.js patterns
  async initializeWithRetry(config = {}) {
    return this._safeExecute(async () => {
      await this.initialize(config);
    }, 'initialize');
  }

  async startWithRetry() {
    return this._safeExecute(async () => {
      await this.start();
    }, 'start');
  }

  async stopWithRetry() {
    return this._safeExecute(async () => {
      await this.stop();
    }, 'stop');
  }

  async destroyWithRetry() {
    return this._safeExecute(async () => {
      await this.destroy();
    }, 'destroy');
  }

  // Enhanced event handling with Messages.js integration
  registerCommand(command, handler) {
    this._requireMessages().registerCommand(command, handler);
  }

  executeCommand(command, data) {
    return this._requireMessages().execute(command, data);
  }

  registerProcessor(name, processor, options = {}) {
    this._requireMessages().registerProcessor(name, processor, options);
  }

  async processMessage(message, options = {}) {
    return this._requireMessages().process(message, options);
  }

  // Enhanced error handling integration
  registerErrorHandler(errorType, handler) {
    this._requireMessages().registerErrorHandler(errorType, handler);
  }

  setRetryPolicy(operation, policy) {
    this._requireMessages().setRetryPolicy(operation, policy);
  }

  // Performance monitoring integration
  getPerformanceStats() {
    const health = this.getHealth();
    const metrics = this.getMetrics();
    const status = this.getStatus();

    return {
      ...health,
      ...metrics,
      ...status,
      component: this.constructor.name,
      timestamp: new Date().toISOString()
    };
  }
}

export default Component;