import { Logger } from './base/utilities.js';

export class InferenceRule {
  getTriggerTermType() { throw new Error('getTriggerTermType() must be implemented by subclass'); }
  apply(task, memory, context) { throw new Error('apply() must be implemented by subclass'); }
}

export class RuleEngine {
  constructor() { this.rules = new Map(); }

  register(rule) {
    const triggerType = rule.getTriggerTermType();
    !this.rules.has(triggerType) && this.rules.set(triggerType, []);
    this.rules.get(triggerType).push(rule);
  }

  getApplicableRules(task) { return this.rules.get(task.term.termType) || null; }
}

export class Reasoner {
  constructor(strategyRegistry = null, systemContext = null) {
    this.ruleEngine = new RuleEngine();
    this.strategyRegistry = strategyRegistry;
    this.systemContext = systemContext;
    this.defaultStrategy = 'basic_reasoning';
    this.overlapCheckingEnabled = true;
    this._initializeRules();
    this.strategyRegistry && this._registerWithStrategyRegistry();
  }

  _initializeRules() {}

  _registerWithStrategyRegistry() {
    this.strategyRegistry.registerStrategy(this.defaultStrategy, {
      execute: (focusSet, memory, context) => this._basicReason(focusSet, memory, context)
    }, {
      description: 'Basic reasoning using rule engine',
      type: 'reasoning',
      group: 'default'
    });
  }

  reason(focusSet, memory, context) {
    if (this.strategyRegistry && this.systemContext) {
      try {
        return this.strategyRegistry.executeStrategy(this.defaultStrategy, focusSet, memory, context);
      } catch (error) {
        Logger.warn(`Strategy execution failed, falling back to basic reasoning: ${error.message}`);
      }
    }
    return this._basicReason(focusSet, memory, context);
  }

  _basicReason(focusSet, memory, context) {
    const allNewTasks = [];
    for (const originalTask of focusSet) {
      const applicableRules = this.ruleEngine.getApplicableRules(originalTask);
      if (!applicableRules) continue;
      for (const rule of applicableRules) {
        try {
          const newTasks = rule.apply(originalTask, memory, context);
          if (Array.isArray(newTasks)) {
            const tasksToAdd = this.overlapCheckingEnabled
              ? newTasks.filter(derivedTask => !this._hasOverlap(derivedTask, originalTask))
              : newTasks;
            allNewTasks.push(...tasksToAdd);
          }
        } catch (error) {
          Logger.error(`Error applying rule: ${error.message}`);
        }
      }
    }
    return allNewTasks;
  }

  _hasOverlap(taskA, taskB) { return taskA?.stamp?.overlaps(taskB?.stamp) || false; }

  reasonWithStrategy(focusSet, memory, context) {
    if (!this.strategyRegistry) return this._basicReason(focusSet, memory, context);
    try {
      const strategyName = this._selectReasoningStrategy(focusSet, memory, context);
      return this.strategyRegistry.executeStrategy(strategyName, focusSet, memory, context);
    } catch (error) {
      Logger.error(`Strategy selection or execution failed: ${error.message}`);
      return this._basicReason(focusSet, memory, context);
    }
  }

  _selectReasoningStrategy(focusSet, memory, context) { return this.defaultStrategy; }

  addRule(rule) { this.ruleEngine.register(rule); }
  setOverlapChecking(enabled) { this.overlapCheckingEnabled = enabled; }
  isOverlapCheckingEnabled() { return this.overlapCheckingEnabled; }
}
