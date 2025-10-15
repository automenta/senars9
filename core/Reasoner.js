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
  constructor(strategyRegistry = null, systemContext = null) {
    super();

    this.strategyRegistry = strategyRegistry;
    this.systemContext = systemContext;
    this.defaultStrategy = 'basic_reasoning';
    this.overlapCheckingEnabled = true;

    this.ruleManager = new RuleManager();
    this.applicationEngine = new RuleApplicationEngine(this.ruleManager);
    this.winnowing = null;
    this.derivation = null;
    this.lm = null;
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
    this.ruleManager = new RuleManager();
    this.applicationEngine = new RuleApplicationEngine(this.ruleManager);
  }

  registerRule(rule, group = 'general') {
    this.ruleManager.register(rule, group);
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

  setLM(lm) {
    this.lm = lm;
  }

  setMemory(memory) {
    this.memory = memory;
  }

  async reason(focusSet, memory, context = {}) {
    this.memory = memory;
    if (!focusSet?.length) return [];

    const derivedTasks = [];
    const ruleContext = { memory, tasks: focusSet, context };

    await this.applicationEngine.applyRules(focusSet, derivedTasks, ruleContext);
    await this.applicationEngine.applyDualPremiseRules(focusSet, derivedTasks, ruleContext);

    return derivedTasks;
  }

  reasonWithStrategy(focusSet, memory, context) {
    return this.strategyRegistry
      ? this.strategyRegistry.executeStrategy(this._selectReasoningStrategy(focusSet, memory, context), focusSet, memory, context)
      : this.reason(focusSet, memory, context);
  }

  _selectReasoningStrategy(focusSet, memory, context) { return this.defaultStrategy; }

  _hasOverlap(taskA, taskB) { return taskA?.stamp?.overlaps(taskB?.stamp) || false; }

  async performAdvancedReasoning(type, params = {}, context = {}) {
    if (!this.lm) return this._createErrorResult(type, `LM unavailable for ${type} reasoning`, params);

    try {
      const prompt = this._generatePrompt(type, params);
      const result = await this.lm.generateText(prompt);

      const reasoningResult = {
        original: result,
        type,
        timestamp: context.currentTime || Date.now(),
        ...params
      };

      this.reasoningHistory.push(reasoningResult);
      return reasoningResult;
    } catch (error) {
      return this._createErrorResult(type, error.message, params);
    }
  }

  _generatePrompt(type, params) {
    const prompts = {
      temporal: () => `Analyze temporally: "${params.scenario}". Time points: ${params.timepoints?.join(', ') || 'none'}. Provide temporal relationships, sequence analysis, and timing implications.`,
      counterfactual: () => `Explore counterfactual: "${params.scenario}". Analyze what would happen if this were true, what conditions would need to change, and the potential consequences.`,
      causal: () => `Analyze causal relationship: "${params.cause}" leads to "${params.effect}". Explain the causal mechanism, intermediate steps, and validity of this relationship.`
    };

    return prompts[type]?.() || `Perform ${type} reasoning with provided parameters.`;
  }

  _createErrorResult(type, error, params) {
    const typeNames = { temporal: 'Temporal', counterfactual: 'Counterfactual', causal: 'Causal' };
    return {
      original: `${typeNames[type] || 'Advanced'} analysis: ${JSON.stringify(params)}`,
      type,
      error,
      ...params
    };
  }

  async performTemporalReasoning(scenario, timepoints = [], context = {}) {
    return this.performAdvancedReasoning('temporal', { scenario, timepoints }, context);
  }

  async performCounterfactualReasoning(scenario, context = {}) {
    return this.performAdvancedReasoning('counterfactual', { scenario }, context);
  }

  async performCausalReasoning(cause, effect, context = {}) {
    return this.performAdvancedReasoning('causal', { cause, effect }, context);
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
