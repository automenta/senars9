import createCore from './createCore.js';
import { Logger } from './Utils.js';

class System {
  constructor(config = {}) {
    this.config = config;
    this.core = null;
  }

  async start() {
    if (this.core) {
      console.warn('System is already running.');
      return;
    }
    this.core = await createCore(this.config);
    await this.core.start();
  }

  async stop() {
    if (!this.core) return;
    await this.core.stop();
    await this.core.destroy();
    this.core = null;
  }

  input(task) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before inputting tasks.');
    }
    this.core.messages.emit('task.input', task);
  }

  on(event, handler) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before registering event handlers.');
    }
    this.core.messages.on(event, handler);
  }

  off(event, handler) {
    if (!this.core) {
      return; // Fail silently if trying to unregister from a stopped system
    }
    this.core.messages.off(event, handler);
  }
}

export default System;