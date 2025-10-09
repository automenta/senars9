import Config from './Config.js';
import Messages from './Messages.js';
import Rules from './Rules.js';
import Memory from './Memory.js';
import Reasoning from './Reasoning.js';
import LM from './lm/LM.js'; // Add LM component import
import AdjacencyBag from './AdjacencyBag.js';
import GraphTraversal from './GraphTraversal.js';
import HTNPlanner from './plan/HTNPlanner.js';
import AnalysisEngine from './analysis/AnalysisEngine.js';
import DataIngestor from './analysis/DataIngestor.js';
import ReportGenerator from './analysis/ReportGenerator.js';
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
    this.registerComponent('lm', new LM()); // Register LM component
    this.registerComponent('analysis', new AnalysisEngine()); // Register AnalysisEngine component
    this.registerComponent('ingestor', new DataIngestor()); // Register DataIngestor component
    this.registerComponent('reports', new ReportGenerator()); // Register ReportGenerator component

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
    // Initialize config component first as others may depend on it
    await this.config.initialize(config);

    // Initialize all other components with their specific configurations
    for (const name of this.registrationOrder) {
      if (name === 'config') continue;
      try {
        const componentConfig = this.config.get(`components.${name}`, {});
        await this.componentMap.get(name).initialize(componentConfig);
      } catch (error) {
        console.error(`Failed to initialize component "${name}":`, error);
        throw error;
      }
    }
  }

  async start() {
    // Start components in registration order
    for (const name of this.registrationOrder) {
      try {
        await this.componentMap.get(name).start();
      } catch (error) {
        console.error(`Failed to start component "${name}":`, error);
        throw error;
      }
    }
  }

  async stop() {
    // Stop components in reverse registration order (cleanup dependencies properly)
    for (const name of [...this.registrationOrder].reverse()) {
      try {
        await this.componentMap.get(name).stop();
      } catch (error) {
        console.error(`Failed to stop component "${name}":`, error);
        // Continue stopping other components even if one fails
      }
    }
  }

  async destroy() {
    // Destroy components in reverse registration order (cleanup dependencies properly)
    for (const name of [...this.registrationOrder].reverse()) {
      try {
        await this.componentMap.get(name).destroy();
      } catch (error) {
        console.error(`Failed to destroy component "${name}":`, error);
        // Continue destroying other components even if one fails
      }
    }
  }
}

export default Core;