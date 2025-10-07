/**
 * @file: core/Core.js
 * @description: The main orchestrator for the SeNARS system. Manages component lifecycle and provides access via metaprogramming.
 * @module Core
 */

import Config from './Config.js';
import Messages from './Messages.js';

class Core {
  constructor() {
    this.components = new Map();

    // Register foundational components
    this.registerComponent('config', new Config());
    this.registerComponent('messages', new Messages());

    // Metaprogramming-driven component access
    return new Proxy(this, {
      get: (target, prop) => {
        if (target.components.has(prop)) {
          return target.components.get(prop);
        }
        return target[prop];
      },
    });
  }

  /**
   * Registers a component with the core system.
   * @param {string} name - The name of the component.
   * @param {object} component - The component instance.
   */
  registerComponent(name, component) {
    if (this.components.has(name)) {
      throw new Error(`Component "${name}" is already registered.`);
    }
    this.components.set(name, component);
    component.core = this; // Provide a reference to the core
  }

  /**
   * Initializes all registered components.
   * @param {object} initialConfig - The initial system configuration.
   * @returns {Promise<void>}
   */
  async initialize(initialConfig = {}) {
    await this.config.initialize(initialConfig);

    for (const [name, component] of this.components) {
      if (name !== 'config') { // Config is already initialized
        const componentConfig = this.config.get(`components.${name}`, {});
        await component.initialize(componentConfig);
      }
    }
  }

  /**
   * Starts all registered components.
   * @returns {Promise<void>}
   */
  async start() {
    for (const component of this.components.values()) {
      await component.start();
    }
  }

  /**
   * Stops all registered components.
   * @returns {Promise<void>}
   */
  async stop() {
    for (const component of this.components.values()) {
      await component.stop();
    }
  }
}

export default Core;