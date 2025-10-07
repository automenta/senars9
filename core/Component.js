class Component {
  constructor() {
    this.status = 'uninitialized';
    this.initialized = false;
    this.started = false;
  }

  async initialize(config = {}) {
    this.config = config;
    this.status = 'initialized';
    this.initialized = true;
  }

  async start() {
    this.status = 'running';
    this.started = true;
  }

  async stop() {
    this.status = 'stopped';
    this.started = false;
  }

  async destroy() {
    this.status = 'destroyed';
    this.initialized = false;
    this.started = false;
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
    if (!this.core?.messages) throw new Error('Messages component not available on core.');
    this.core.messages.on(event, handler);
  }

  off(event, handler) {
    if (!this.core?.messages) throw new Error('Messages component not available on core.');
    this.core.messages.off(event, handler);
  }

  emit(event, data) {
    if (!this.core?.messages) throw new Error('Messages component not available on core.');
    this.core.messages.emit(event, data);
  }
}

export default Component;