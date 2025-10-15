import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';

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

    this.rules = new Map();
    this.ruleGroups = new Map();
    this.enabledRuleIds = new Set();

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
    this.rules.clear();
    this.ruleGroups.clear();
    this.enabledRuleIds.clear();
  }

  registerRule(rule, group = 'general') {
    if (!rule?.id) throw new Error('Invalid rule: must have an ID');
    this.rules.set(rule.id, rule);
    this.ruleGroups.has(group) || this.ruleGroups.set(group, new Set());
    this.ruleGroups.get(group).add(rule.id);
    rule.enabled && this.enabledRuleIds.add(rule.id);
  }

  enableRule(idOrGroup) {
    this._toggleRuleGroup(idOrGroup, 'enable');
  }

  disableRule(idOrGroup) {
    this._toggleRuleGroup(idOrGroup, 'disable');
  }

  _toggleRuleGroup(idOrGroup, action) {
    const enable = action === 'enable';
    const ruleIds = this.rules.has(idOrGroup)
      ? [idOrGroup]
      : this.ruleGroups.get(idOrGroup) || [];

    ruleIds.forEach(id => enable ? this.enabledRuleIds.add(id) : this.enabledRuleIds.delete(id));
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

    await this._applyRules(focusSet, derivedTasks, ruleContext);
    await this._applyDualPremiseRules(focusSet, derivedTasks, ruleContext);

    return derivedTasks;
  }

  async _applyRules(focusSet, derivedTasks, ruleContext, filterFn = () => true) {
    for (const task of focusSet) {
      const context = { ...ruleContext, premise: { task } };

      for (const ruleId of this.enabledRuleIds) {
        const rule = this.rules.get(ruleId);
        if (!rule || !filterFn(rule) || (rule.canApply && !rule.canApply(context))) continue;

        const result = await this._applyRule(rule, context, ruleId);
        if (result?.length) derivedTasks.push(...result);
      }
    }
  }

  async _applyDualPremiseRules(focusSet, derivedTasks, ruleContext) {
    for (let i = 0; i < focusSet.length; i++) {
      for (let j = i + 1; j < focusSet.length; j++) {
        const task1 = focusSet[i], task2 = focusSet[j];
        const context = {
          ...ruleContext,
          premise: { task: task1 },
          secondaryPremise: { task: task2 }
        };

        for (const ruleId of this.enabledRuleIds) {
          const rule = this.rules.get(ruleId);
          if (rule?.type !== 'nal' || (rule.canApply && !rule.canApply(context))) continue;

          const result = await this._applyRule(rule, context, ruleId);
          if (result?.length) derivedTasks.push(...result);
        }
      }
    }
  }

  async _applyRule(rule, context, ruleId) {
    try {
      const result = await rule.apply(context);
      return result ? (Array.isArray(result) ? result : [result]) : null;
    } catch (error) {
      Logger.error(`Rule ${ruleId} failed: ${error.message}`);
      return null;
    }
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
    const ruleCounts = this._countRulesByType();
    return {
      totalRules: this.rules.size,
      ...ruleCounts,
      enabledRules: this.enabledRuleIds.size,
      reasoningHistorySize: this.reasoningHistory.length,
      hasLM: !!this.lm,
      hasMemory: !!this.memory
    };
  }

  _countRulesByType() {
    const counts = { lm: 0, nal: 0 };
    for (const rule of this.rules.values()) {
      if (rule.type === 'lm') counts.lm++;
      else if (rule.type === 'nal') counts.nal++;
    }
    return counts;
  }

  getReasoningHistory(limit = this.maxHistorySize) {
    return this.reasoningHistory.slice(-limit);
  }
}

// RuleEngine is the same as Reasoner for compatibility
export const RuleEngine = Reasoner;
