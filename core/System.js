import createCore from './createCore.js';

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
    // Emitting an event is a decoupled way to introduce tasks.
    // A dedicated component like Memory will listen for this event.
    this.core.messages.emit('task.input', task);
  }

  on(event, handler) {
    if (!this.core) {
      // Allow registering handlers before start, but they will be on a non-existent core.
      // Let's enforce that the system must be started.
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