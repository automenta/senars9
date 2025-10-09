import Config from '../config/Config.js';
import Messages from '../messaging/Messages.js';
import Rules from '../reasoning/Rules.js';
import Memory from '../memory/Memory.js';
import Reasoning from '../reasoning/Reasoning.js';
import LM from '../lm/LM.js'; // Add LM component import
import AdjacencyBag from '../memory/AdjacencyBag.js';
import GraphTraversal from '../memory/GraphTraversal.js';
import HTNPlanner from '../plan/HTNPlanner.js';
import AStarPlanner from '../plan/AStarPlanner.js';
import PlanProcessor from '../plan/PlanProcessor.js';
import AnalysisEngine from '../analysis/AnalysisEngine.js';
import DataIngestor from '../analysis/DataIngestor.js';
import ReportGenerator from '../analysis/ReportGenerator.js';
import BootstrapSystem from '../analysis/BootstrapSystem.js';
import PatternDetector from '../analysis/PatternDetector.js';
import { Focus } from '../memory/Memory.js';

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
    
    // Initialize graph components
    const adjacencyBag = new AdjacencyBag();
    this.registerComponent('adjacencyBag', adjacencyBag);
    this.registerComponent('graphTraversal', new GraphTraversal(adjacencyBag));
    
    // Initialize planning components
    const htnPlanner = new HTNPlanner();
    this.registerComponent('htnPlanner', htnPlanner);
    this.registerComponent('aStarPlanner', new AStarPlanner(adjacencyBag));
    
    // Initialize PlanProcessor (dependencies will be set up during initialization)
    this.registerComponent('planProcessor', new PlanProcessor(null, null));
    
    this.registerComponent('analysis', new AnalysisEngine()); // Register AnalysisEngine component
    this.registerComponent('ingestor', new DataIngestor()); // Register DataIngestor component
    this.registerComponent('reports', new ReportGenerator()); // Register ReportGenerator component
    this.registerComponent('bootstrap', new BootstrapSystem()); // Register BootstrapSystem component
    this.registerComponent('patternDetector', new PatternDetector()); // Register PatternDetector component

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
    
    // After all components are initialized, establish cross-references
    // This is needed for components that depend on other components
    if (this.planProcessor) {
      // Set up LM reference after initialization
      this.planProcessor.lm = this.lm || null;
      this.planProcessor.htnPlanner = this.htnPlanner || null;
    }
    
    if (this.graphTraversal && this.adjacencyBag) {
      this.graphTraversal.adjacencyBag = this.adjacencyBag;
    }
    
    if (this.aStarPlanner && this.adjacencyBag) {
      this.aStarPlanner.adjacencyBag = this.adjacencyBag;
    }
    
    if (this.bootstrap) {
      // Set up dependencies for BootstrapSystem
      this.bootstrap.setupDependencies(
        this.lm || null,
        this.planProcessor || null,
        this.htnPlanner || null,
        this.system || null  // This might be set up later if System component exists
      );
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