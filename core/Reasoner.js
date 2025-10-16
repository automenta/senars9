import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';
import { RuleManager } from './reasoning/RuleManager.js';
import { RuleApplicationEngine } from './reasoning/RuleApplicationEngine.js';

export class NALRule {
  getTriggerTermType() { throw new Error('getTriggerTermType must be implemented by subclasses'); }
  apply(context) { throw new Error('apply must be implemented by subclasses'); }
  canApply(context) { return true; }
}

export class Reasoner extends Component {
  constructor(lm = null, strategyRegistry = null, systemContext = null) {
    super();

    this.strategyRegistry = strategyRegistry;
    this.systemContext = systemContext;
    this.defaultStrategy = 'basic_reasoning';
    this.overlapCheckingEnabled = true;

    this.lm = lm;
    this.ruleManager = new RuleManager(this.lm);
    this.applicationEngine = new RuleApplicationEngine(this.ruleManager);
    this.winnowing = null;
    this.derivation = null;
    this.memory = null;
    this.strategies = new Map();
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;

    this._initialize();
    strategyRegistry && this._registerWithStrategyRegistry();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this._resetState();
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;
  }

  _initialize() { this._resetState(); }
  _resetState() {
    this.strategies.clear();
    this.reasoningHistory = [];
    this.ruleManager = new RuleManager(this.lm);
    this.applicationEngine = new RuleApplicationEngine(this.ruleManager);
  }

  addRule(rule, group = 'general') {
    this.ruleManager.addRule(rule, group);
  }

  enableRule(idOrGroup) {
    this.ruleManager.enable(idOrGroup);
  }

  disableRule(idOrGroup) {
    this.ruleManager.disable(idOrGroup);
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

  setMemory(memory) {
    this.memory = memory;
  }

  async reason(focusSet, memory, context = {}) {
    this.memory = memory;
    if (!focusSet?.length) return [];

    const derivedTasks = [];
    const ruleContext = { memory, tasks: focusSet, context };

    Logger.info(`Applying rules to focus set of size ${focusSet.length}`);
    await this.applicationEngine.applyRules(focusSet, derivedTasks, ruleContext);
    await this.applicationEngine.applyDualPremiseRules(focusSet, derivedTasks, ruleContext);
    Logger.info(`Derived ${derivedTasks.length} new tasks`);

    return derivedTasks;
  }

  reasonWithStrategy(focusSet, memory, context) {
    return this.strategyRegistry
      ? this.strategyRegistry.executeStrategy(this._selectReasoningStrategy(focusSet, memory, context), focusSet, memory, context)
      : this.reason(focusSet, memory, context);
  }

  _selectReasoningStrategy(focusSet, memory, context) { return this.defaultStrategy; }

  _hasOverlap(taskA, taskB) { return taskA?.stamp?.overlaps(taskB?.stamp) || false; }

  async performTemporalReasoning(scenario, timepoints = [], context = {}) {
    // Create a task that will trigger temporal reasoning rules
    const temporalTask = {
      term: `temporal_analysis_of_${scenario.replace(/ /g, '_')}`,
      punctuation: '.',
      truth: { frequency: 0.8, confidence: 0.7 },
      priority: 0.6,
      metadata: { scenario, timepoints, reasoningType: 'temporal' }
    };

    if (this.memory) {
      await this.memory.input(temporalTask);
    }

    return {
      original: `Temporal analysis initiated: ${scenario}`,
      type: 'temporal',
      scenario,
      timepoints,
      timestamp: Date.now()
    };
  }

  async performCounterfactualReasoning(scenario, context = {}) {
    // Create a task that will trigger counterfactual reasoning rules
    const counterfactualTask = {
      term: `counterfactual_analysis_of_${scenario.replace(/ /g, '_')}`,
      punctuation: '.',
      truth: { frequency: 0.7, confidence: 0.6 },
      priority: 0.5,
      metadata: { scenario, reasoningType: 'counterfactual' }
    };

    if (this.memory) {
      await this.memory.input(counterfactualTask);
    }

    return {
      original: `Counterfactual analysis initiated: ${scenario}`,
      type: 'counterfactual',
      scenario,
      timestamp: Date.now()
    };
  }

  async performCausalReasoning(cause, effect, context = {}) {
    // Create a task that will trigger causal reasoning rules
    const causalTask = {
      term: `causal_analysis_${cause.replace(/ /g, '_')}_leads_to_${effect.replace(/ /g, '_')}`,
      punctuation: '.',
      truth: { frequency: 0.8, confidence: 0.7 },
      priority: 0.6,
      metadata: { cause, effect, reasoningType: 'causal' }
    };

    if (this.memory) {
      await this.memory.input(causalTask);
    }

    return {
      original: `Causal analysis initiated: ${cause} → ${effect}`,
      type: 'causal',
      cause,
      effect,
      timestamp: Date.now()
    };
  }

  addStrategy(strategy) {
    if (!strategy?.id || typeof strategy.execute !== 'function') {
      throw new Error('Invalid strategy: must have an id and execute function');
    }
    this.strategies.set(strategy.id, strategy);
  }

  setOverlapChecking(enabled) { this.overlapCheckingEnabled = enabled; }
  isOverlapCheckingEnabled() { return this.overlapCheckingEnabled; }

  getStats() {
    return {
      ...this.ruleManager.getStats(),
      reasoningHistorySize: this.reasoningHistory.length,
      hasLM: !!this.lm,
      hasMemory: !!this.memory
    };
  }

  getReasoningHistory(limit = this.maxHistorySize) {
    return this.reasoningHistory.slice(-limit);
  }
}

// RuleEngine is the same as Reasoner for compatibility
export const RuleEngine = Reasoner;
