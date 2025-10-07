/**
 * @file: core/Core.js
 * @description: The main orchestrator for the SeNARS system. Manages component lifecycle and provides access via metaprogramming.
 * @module Core
 */

import Config from './Config.js';
import Messages from './Messages.js';

class Core {
  constructor() {
    this.componentMap = new Map();
    this.registrationOrder = [];

    // Register foundational components
    this.registerComponent('config', new Config());
    this.registerComponent('messages', new Messages());

    // Metaprogramming-driven component access
    return new Proxy(this, {
      get: (target, prop) => {
        if (target.componentMap.has(prop)) {
          return target.componentMap.get(prop);
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
    if (this.componentMap.has(name)) {
      throw new Error(`Component "${name}" is already registered.`);
    }
    this.componentMap.set(name, component);
    this.registrationOrder.push(name);
    component.core = this; // Provide a reference to the core
  }

  /**
   * Retrieves a component by its name.
   * @param {string} name - The name of the component.
   * @returns {object|undefined} The component instance.
   */
  getComponent(name) {
    return this.componentMap.get(name);
  }

  /**
   * Initializes all registered components in order of registration.
   * @param {object} initialConfig - The initial system configuration.
   * @returns {Promise<void>}
   */
  async initialize(initialConfig = {}) {
    // Initialize config first as other components may depend on it
    await this.config.initialize(initialConfig);

    for (const name of this.registrationOrder) {
      if (name !== 'config') { // Config is already initialized
        const component = this.componentMap.get(name);
        const componentConfig = this.config.get(`components.${name}`, {});
        await component.initialize(componentConfig);
      }
    }
  }

  /**
   * Starts all registered components in order of registration.
   * @returns {Promise<void>}
   */
  async start() {
    for (const name of this.registrationOrder) {
      await this.componentMap.get(name).start();
    }
  }

  /**
   * Stops all registered components in reverse order of registration.
   * @returns {Promise<void>}
   */
  async stop() {
    for (const name of [...this.registrationOrder].reverse()) {
      await this.componentMap.get(name).stop();
    }
  }

  /**
   * Destroys all registered components in reverse order of registration.
   * @returns {Promise<void>}
   */
  async destroy() {
    for (const name of [...this.registrationOrder].reverse()) {
      await this.componentMap.get(name).destroy();
    }
  }
}

export default Core;