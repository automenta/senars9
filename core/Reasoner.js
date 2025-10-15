import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';

/**
 * Base class for NARS inference rules.
 */
export class NALRule {
  /**
   * Returns the term type that triggers this rule.
   * @returns {number} TermType that triggers this rule
   */
  getTriggerTermType() {
    throw new Error('getTriggerTermType must be implemented by subclasses');
  }

  /**
   * Applies the inference rule to the given premises.
   * @param {object} context - The context object.
   * @returns {Task[]} Array of derived tasks
   */
  apply(context) {
    throw new Error('apply must be implemented by subclasses');
  }

  canApply(context) {
    return true;
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
    this.rules = new Map(); // All rules, mapped by ID
    this.ruleGroups = new Map(); // Rules categorized by group
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
    this.rules.clear();
    this.ruleGroups.clear();
    this.enabledRuleIds.clear();
  }

  /**
   * Registers a new rule with the reasoner
   * @param {Rule} rule - The rule to register
   * @param {string} group - The group to assign the rule to
   */
  registerRule(rule, group = 'general') {
    if (!rule || !rule.id) {
      throw new Error('Invalid rule: must have an ID');
    }
    this.rules.set(rule.id, rule);
    if (!this.ruleGroups.has(group)) {
      this.ruleGroups.set(group, new Set());
    }
    this.ruleGroups.get(group).add(rule.id);
    if (rule.enabled) {
      this.enabledRuleIds.add(rule.id);
    }
  }

  /**
   * Enables a rule or a group of rules
   * @param {string} idOrGroup - The ID of the rule or the name of the group to enable
   */
  enableRule(idOrGroup) {
    if (this.rules.has(idOrGroup)) {
      this.enabledRuleIds.add(idOrGroup);
    } else if (this.ruleGroups.has(idOrGroup)) {
      for (const ruleId of this.ruleGroups.get(idOrGroup)) {
        this.enabledRuleIds.add(ruleId);
      }
    }
  }

  /**
   * Disables a rule or a group of rules
   * @param {string} idOrGroup - The ID of the rule or the name of the group to disable
   */
  disableRule(idOrGroup) {
    if (this.rules.has(idOrGroup)) {
      this.enabledRuleIds.delete(idOrGroup);
    } else if (this.ruleGroups.has(idOrGroup)) {
      for (const ruleId of this.ruleGroups.get(idOrGroup)) {
        this.enabledRuleIds.delete(ruleId);
      }
    }
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

  async reason(focusSet, memory, context = {}) {
    this.memory = memory;
    const derivedTasks = [];

    if (!focusSet || focusSet.length === 0) {
      return derivedTasks;
    }

    // First, process each task individually against the rules
    for (const task1 of focusSet) {
      for (const ruleId of this.enabledRuleIds) {
        const rule = this.rules.get(ruleId);
        if (rule) {
          // Check if the rule can be applied to a single premise
          if (rule.canApply && !rule.canApply({ premise: { task: task1 }, memory, tasks: focusSet, context })) {
            continue;
          }
          
          let result;
          try {
            // Use the newer-style context only
            result = await rule.apply({ premise: { task: task1 }, memory, tasks: focusSet, context });
          } catch (error) {
            console.error(`Error applying rule ${ruleId}:`, error);
            continue;
          }
          
          if (result) {
            const results = Array.isArray(result) ? result : [result];
            derivedTasks.push(...results);
          }
        }
      }
    }

    // Second, for NAL-style inference rules that work with pairs of tasks
    for (let i = 0; i < focusSet.length; i++) {
      for (let j = 0; j < focusSet.length; j++) {
        if (i !== j) { // Don't compare a task with itself
          const task1 = focusSet[i];
          const task2 = focusSet[j];
          
          for (const ruleId of this.enabledRuleIds) {
            const rule = this.rules.get(ruleId);
            if (rule && rule.type === 'nal') {
              // Check if the rule can be applied to the pair of tasks
              if (rule.canApply && !rule.canApply({ 
                premise: { task: task1 }, 
                secondaryPremise: { task: task2 }, 
                memory, 
                tasks: focusSet, 
                context 
              })) {
                continue;
              }
              
              let result;
              try {
                // Apply rule with both premises
                result = await rule.apply({ 
                  premise: { task: task1 }, 
                  secondaryPremise: { task: task2 }, 
                  memory, 
                  tasks: focusSet, 
                  context 
                });
              } catch (error) {
                console.error(`Error applying NAL rule ${ruleId} to task pair:`, error);
                continue;
              }
              
              if (result) {
                const results = Array.isArray(result) ? result : [result];
                derivedTasks.push(...results);
              }
            }
          }
        }
      }
    }

    return derivedTasks;
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
  async performTemporalReasoning(scenario, timepoints = [], context = {}) {
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
      
      const currentTime = context.currentTime || Date.now();
      const reasoningResult = {
        original: result,
        type: 'temporal',
        scenario: scenario,
        timepoints: timepoints,
        timestamp: currentTime
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

  async performCounterfactualReasoning(scenario, context = {}) {
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
      
      const currentTime = context.currentTime || Date.now();
      const reasoningResult = {
        original: result,
        type: 'counterfactual',
        scenario: scenario,
        timestamp: currentTime
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

  async performCausalReasoning(cause, effect, context = {}) {
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
      
      const currentTime = context.currentTime || Date.now();
      const reasoningResult = {
        original: result,
        type: 'causal',
        cause: cause,
        effect: effect,
        timestamp: currentTime
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
    // Count rules by type
    let lmRulesCount = 0;
    let nalRulesCount = 0;
    
    for (const rule of this.rules.values()) {
      if (rule.type === 'lm') {
        lmRulesCount++;
      } else if (rule.type === 'nal') {
        nalRulesCount++;
      }
    }
    
    return {
      totalRules: this.rules.size,
      lmRules: lmRulesCount,
      nalRules: nalRulesCount,
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
