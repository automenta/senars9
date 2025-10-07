const STATES = { UNINITIALIZED: 'uninitialized', INITIALIZED: 'initialized', RUNNING: 'running', STOPPED: 'stopped', DESTROYED: 'destroyed' };

class Component {
  constructor() {
    this.status = STATES.UNINITIALIZED;
    this.flags = { initialized: false, started: false };
  }

  async initialize(config = {}) {
    this.config = config;
    this._setState(STATES.INITIALIZED, { initialized: true });
  }

  async start() {
    this._setState(STATES.RUNNING, { started: true });
  }

  async stop() {
    this._setState(STATES.STOPPED, { started: false });
  }

  async destroy() {
    this._setState(STATES.DESTROYED, { initialized: false, started: false });
  }

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
}

export default Component;