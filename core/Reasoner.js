import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';

/**
 * Base class for NARS inference rules.
 */
export class InferenceRule {
  /**
   * Returns the term type that triggers this rule.
   * @returns {number} TermType that triggers this rule
   */
  getTriggerTermType() {
    throw new Error('getTriggerTermType must be implemented by subclasses');
  }

  /**
   * Applies the inference rule to the given premises.
   * @param {Task} premise1 - The first premise task
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The current cycle's context
   * @returns {Task[]} Array of derived tasks
   */
  apply(premise1, memory, context) {
    throw new Error('apply must be implemented by subclasses');
  }
}

/**
 * Unified Reasoner system that combines all reasoning capabilities
 */
export class Reasoner extends Component {
  constructor(strategyRegistry = null, systemContext = null) {
    super();
    
    // Core reasoning components
    this.strategyRegistry = strategyRegistry;
    this.systemContext = systemContext;
    this.defaultStrategy = 'basic_reasoning';
    this.overlapCheckingEnabled = true;
    
    // Rule management
    this.rules = new Map(); // All rules
    this.lmRules = new Map(); // LM rules only
    this.nalRules = new Map(); // NAL rules only
    this.enabledRuleIds = new Set();
    
    // Reasoning system components
    this.winnowing = null; // Will be initialized if needed
    this.derivation = null; // Will be initialized if needed
    this.lm = null; // Language model instance
    this.memory = null; // Memory instance
    this.strategies = new Map();
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;
    
    // Initialize the reasoning system
    this._initialize();
    this.strategyRegistry && this._registerWithStrategyRegistry();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.strategies.clear();
    this.reasoningHistory = [];
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;
  }

  _initialize() {
    this.strategies.clear();
    this.reasoningHistory = [];
  }

  _registerWithStrategyRegistry() {
    if (!this.strategyRegistry) return;
    
    this.strategyRegistry.registerStrategy(this.defaultStrategy, {
      execute: (focusSet, memory, context) => this.reason(focusSet, memory, context)
    }, {
      description: 'Basic reasoning using unified rule engine',
      type: 'reasoning',
      group: 'default'
    });
  }

  setLM(lm) {
    this.lm = lm;
  }

  setMemory(memory) {
    this.memory = memory;
  }

  reason(focusSet, memory, context = {}) {
    this.memory = memory;
    return []; // Return empty for now
  }

  reasonWithStrategy(focusSet, memory, context) {
    if (!this.strategyRegistry) return this.reason(focusSet, memory, context);
    try {
      const strategyName = this._selectReasoningStrategy(focusSet, memory, context);
      return this.strategyRegistry.executeStrategy(strategyName, focusSet, memory, context);
    } catch (error) {
      Logger.error(`Strategy selection or execution failed: ${error.message}`);
      return this.reason(focusSet, memory, context);
    }
  }

  _selectReasoningStrategy(focusSet, memory, context) { return this.defaultStrategy; }

  _hasOverlap(taskA, taskB) { return taskA?.stamp?.overlaps(taskB?.stamp) || false; }

  /**
   * Advanced reasoning modalities - temporal, counterfactual, causal
   */
  async performTemporalReasoning(scenario, timepoints = []) {
    if (!this.lm) {
      return {
        original: `Temporal analysis: ${scenario}`,
        type: 'temporal',
        error: 'No language model available for temporal reasoning'
      };
    }

    try {
      const prompt = `Analyze the following scenario temporally: "${scenario}". Time points: ${timepoints.join(', ')}. Provide temporal relationships, sequence analysis, and timing implications.`;
      const result = await this.lm.generateText(prompt);
      
      const reasoningResult = {
        original: result,
        type: 'temporal',
        scenario: scenario,
        timepoints: timepoints,
        timestamp: Date.now()
      };

      this.reasoningHistory.push(reasoningResult);
      return reasoningResult;
    } catch (error) {
      return {
        original: `Temporal analysis: ${scenario}`,
        type: 'temporal',
        error: error.message
      };
    }
  }

  async performCounterfactualReasoning(scenario) {
    if (!this.lm) {
      return {
        original: `Counterfactual analysis: ${scenario}`,
        type: 'counterfactual',
        error: 'No language model available for counterfactual reasoning'
      };
    }

    try {
      const prompt = `Explore the following counterfactual scenario: "${scenario}". Analyze what would happen if this were true, what conditions would need to change, and the potential consequences.`;
      const result = await this.lm.generateText(prompt);
      
      const reasoningResult = {
        original: result,
        type: 'counterfactual',
        scenario: scenario,
        timestamp: Date.now()
      };

      this.reasoningHistory.push(reasoningResult);
      return reasoningResult;
    } catch (error) {
      return {
        original: `Counterfactual analysis: ${scenario}`,
        type: 'counterfactual',
        error: error.message
      };
    }
  }

  async performCausalReasoning(cause, effect) {
    if (!this.lm) {
      return {
        original: `Causal analysis: ${cause} -> ${effect}`,
        type: 'causal',
        error: 'No language model available for causal reasoning'
      };
    }

    try {
      const prompt = `Analyze the causal relationship: "${cause}" leads to "${effect}". Explain the causal mechanism, intermediate steps, and validity of this relationship.`;
      const result = await this.lm.generateText(prompt);
      
      const reasoningResult = {
        original: result,
        type: 'causal',
        cause: cause,
        effect: effect,
        timestamp: Date.now()
      };

      this.reasoningHistory.push(reasoningResult);
      return reasoningResult;
    } catch (error) {
      return {
        original: `Causal analysis: ${cause} -> ${effect}`,
        type: 'causal',
        error: error.message
      };
    }
  }

  /**
   * Strategy management methods
   */
  addStrategy(strategy) {
    if (!strategy || !strategy.id || typeof strategy.execute !== 'function') {
      throw new Error('Invalid strategy: must have an id and execute function');
    }
    this.strategies.set(strategy.id, strategy);
  }

  setOverlapChecking(enabled) { this.overlapCheckingEnabled = enabled; }
  isOverlapCheckingEnabled() { return this.overlapCheckingEnabled; }
  
  // Get statistics
  getStats() {
    return {
      totalRules: this.rules.size,
      lmRules: this.lmRules.size,
      nalRules: this.nalRules.size,
      enabledRules: this.enabledRuleIds.size,
      reasoningHistorySize: this.reasoningHistory.length,
      hasLM: !!this.lm,
      hasMemory: !!this.memory
    };
  }

  getReasoningHistory(limit = 100) {
    return this.reasoningHistory.slice(-limit);
  }
}

// RuleEngine is the same as Reasoner for compatibility
export const RuleEngine = Reasoner;