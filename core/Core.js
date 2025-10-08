import Config from './Config.js';
import Messages from './Messages.js';
import Rules from './Rules.js';
import Memory from './Memory.js';
import Reasoning from './Reasoning.js';
import { Focus } from './Memory.js';

class Core {
  constructor() {
    this.componentMap = new Map();
    this.registrationOrder = [];

    this.registerComponent('config', new Config());
    this.registerComponent('messages', new Messages());
    this.registerComponent('rules', new Rules());
    const focus = new Focus();
    this.registerComponent('focus', focus);
    this.registerComponent('memory', new Memory(focus));
    this.registerComponent('reasoning', new Reasoning());

    return new Proxy(this, {
      get: (target, prop) => target.componentMap.has(prop) ? target.componentMap.get(prop) : target[prop],
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

   const initPromises = this.registrationOrder.map(async (name) =>
     name !== 'config' && await this.componentMap.get(name).initialize(this.config.get(`components.${name}`, {})));

   await Promise.all(initPromises);
 }

 async start() {
   await Promise.all(this.registrationOrder.map(name => this.componentMap.get(name).start()));
 }

 async stop() {
   await Promise.all([...this.registrationOrder].reverse().map(name => this.componentMap.get(name).stop()));
 }

 async destroy() {
   await Promise.all([...this.registrationOrder].reverse().map(name => this.componentMap.get(name).destroy()));
 }
}

export default Core;