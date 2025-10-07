/**
 * @file: core/Core.js
 * @description: The main orchestrator for the SeNARS system. Manages component lifecycle and provides access via metaprogramming.
 * @module Core
 */

import Config from './Config.js';
import Messages from './Messages.js';
import Rules from './Rules.js';
import Memory from './Memory.js';

class Core {
  constructor() {
    this.componentMap = new Map();
    this.registrationOrder = [];

    // Register foundational components
    this.registerComponent('config', new Config());
    this.registerComponent('messages', new Messages());
    this.registerComponent('rules', new Rules());
    this.registerComponent('memory', new Memory());

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

 registerComponent(name, component) {
   if (this.componentMap.has(name)) {
     throw new Error(`Component "${name}" already registered`);
   }
   this.componentMap.set(name, component);
   this.registrationOrder.push(name);
   component.core = this;
 }

 getComponent(name) {
   return this.componentMap.get(name);
 }

 async initialize(config = {}) {
   await this.config.initialize(config);

   const initPromises = this.registrationOrder.map(async (name) => {
     if (name !== 'config') {
       const component = this.componentMap.get(name);
       const componentConfig = this.config.get(`components.${name}`, {});
       await component.initialize(componentConfig);
     }
   });

   await Promise.all(initPromises);
 }

 async start() {
   const startPromises = this.registrationOrder.map(name =>
     this.componentMap.get(name).start());
   await Promise.all(startPromises);
 }

 async stop() {
   const stopPromises = [...this.registrationOrder].reverse().map(name =>
     this.componentMap.get(name).stop());
   await Promise.all(stopPromises);
 }

 async destroy() {
   const destroyPromises = [...this.registrationOrder].reverse().map(name =>
     this.componentMap.get(name).destroy());
   await Promise.all(destroyPromises);
 }
}

export default Core;