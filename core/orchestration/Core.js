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
import WebSocketServer from '../system/WebSocketServer.js';
import { Focus } from '../memory/Memory.js';
import { ContradictionAnalyzer } from '../reasoning/ContradictionAnalyzer.js';
import { ResolutionStrategy } from '../reasoning/ResolutionStrategy.js';
import { SystemContext } from '../components/SystemContext.js';
import { StrategyRegistry } from '../components/StrategyRegistry.js';

class Core {
  constructor() {
    this.componentMap = new Map();
    this.registrationOrder = [];
    this.isInitialized = false;

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
    
    // Register Phase 3 metacognition components
    this.registerComponent('strategyRegistry', new StrategyRegistry());
    this.registerComponent('systemContext', new SystemContext(null)); // Initialize with null, will set in _setupDependencies
    this.registerComponent('contradictionAnalyzer', new ContradictionAnalyzer());
    this.registerComponent('resolutionStrategy', new ResolutionStrategy());
    
    this.registerComponent('analysis', new AnalysisEngine()); // Register AnalysisEngine component
    this.registerComponent('ingestor', new DataIngestor()); // Register DataIngestor component
    this.registerComponent('reports', new ReportGenerator()); // Register ReportGenerator component
    this.registerComponent('bootstrap', new BootstrapSystem()); // Register BootstrapSystem component
    this.registerComponent('patternDetector', new PatternDetector()); // Register PatternDetector component
    this.registerComponent('webSocketServer', new WebSocketServer()); // Register WebSocketServer component

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
    
    // Establish cross-component dependencies
    this._setupDependencies();
    
    // Initialize any new components that may have been added but not initialized
    // This handles components that are added in constructor but need special initialization
    await this._initializeNewComponents();
    
    // Mark core as initialized
    this.isInitialized = true;
  }
  
  /**
   * Establish cross-component dependencies after all components are initialized
   */
  _setupDependencies() {
    // PlanProcessor dependencies
    if (this.planProcessor) {
      this.planProcessor.lm = this.lm || null;
      this.planProcessor.htnPlanner = this.htnPlanner || null;
    }
    
    // Graph traversal dependencies
    if (this.graphTraversal && this.adjacencyBag) {
      this.graphTraversal.adjacencyBag = this.adjacencyBag;
    }
    
    if (this.aStarPlanner && this.adjacencyBag) {
      this.aStarPlanner.adjacencyBag = this.adjacencyBag;
    }
    
    // Bootstrap system dependencies
    if (this.bootstrap) {
      this.bootstrap.setupDependencies(
        this.lm || null,
        this.planProcessor || null,
        this.htnPlanner || null,
        this  // Pass the core instance as the system reference
      );
      
      // Add the plan source for NEXT.md to BootstrapSystem
      this.bootstrap.addPlanSource('./NEXT.md', 'file');
    }
    
    // WebSocketServer reference
    if (this.webSocketServer) {
      this.webSocketServer.core = this;
    }
    
    // Set up SystemContext with reference to core
    if (this.systemContext) {
      this.systemContext.system = this;
    }
    
    // Set up reasoning to use strategy registry and system context (if they exist)
    if (this.reasoning && this.strategyRegistry && this.systemContext) {
      // Update the reasoning component to use the strategy registry and system context
      this.reasoning.strategyRegistry = this.strategyRegistry;
      this.reasoning.systemContext = this.systemContext;
    }
    
    // Set up contradiction analyzer to use system context
    if (this.contradictionAnalyzer && this.systemContext) {
      // The contradiction analyzer can access memory and other components through system context
    }
    
    // Set up resolution strategy to use system context
    if (this.resolutionStrategy && this.systemContext) {
      // The resolution strategy can access other components through system context
    }
    
    // Register strategies after dependencies are set up to avoid circular references during initialization
    if (this.strategyRegistry && this.reasoning) {
      // Register default reasoning strategies
      this.strategyRegistry.registerStrategy('basic_reasoning', {
        execute: (tasks, context) => this.reasoning.reason(tasks, context)
      }, {
        description: 'Basic reasoning using inference rules',
        type: 'reasoning',
        group: 'default'
      });
      
      // Register contradiction resolution strategies if available
      if (this.resolutionStrategy) {
        for (const strategyName of this.resolutionStrategy.getAvailableStrategies()) {
          const strategy = {
            execute: (contradiction, sysContext) => this.resolutionStrategy.resolveContradiction(contradiction, strategyName, sysContext)
          };
          
          this.strategyRegistry.registerStrategy(`resolution_${strategyName}`, strategy, {
            description: `Contradiction resolution using ${strategyName} strategy`,
            type: 'contradiction_resolution',
            group: 'resolution'
          });
        }
      }
    }
  }

  /**
   * Initialize components that were added but may not have been initialized yet
   * This method can be called after all dependencies are set up
   */
  async _initializeNewComponents() {
    // Initialize Phase 3 components with appropriate configuration
    if (this.strategyRegistry && !this.strategyRegistry.isInitialized) {
      await this.strategyRegistry.initialize(this.config?.get('components.strategyRegistry', {}) || {});
    }
    
    if (this.systemContext && !this.systemContext.isInitialized) {
      await this.systemContext.initialize(this.config?.get('components.systemContext', {}) || {});
    }
    
    if (this.contradictionAnalyzer && !this.contradictionAnalyzer.isInitialized) {
      await this.contradictionAnalyzer.initialize(this.config?.get('components.contradictionAnalyzer', {}) || {});
    }
    
    if (this.resolutionStrategy && !this.resolutionStrategy.isInitialized) {
      await this.resolutionStrategy.initialize(this.config?.get('components.resolutionStrategy', {}) || {});
    }
  }

  async start() {
    // Check if core has been initialized - if not, initialize first
    // This maintains backward compatibility for cases where start() is called without prior initialize()
    if (!this.isInitialized) {
      await this.initialize({});
    }
    
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