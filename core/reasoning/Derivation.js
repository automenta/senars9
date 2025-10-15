import { Winnowing, SimpleRuleEvaluator } from './lm/Winnowing.js';
import { Task } from '../Task.js';

export class Derivation {
  constructor(options = {}) {
    Object.assign(this, {
      winnowingEnabled: options.winnowingEnabled !== false,
      maxNewTasks: options.maxNewTasks || 10,
      maxNewPremises: options.maxNewPremises || 5,
      winnowing: new Winnowing(),
      simpleEvaluator: new SimpleRuleEvaluator(),
      premiseBuffer: [],
      taskBuffer: [],
      resourcesUsed: {
        rulesApplied: 0,
        tasksGenerated: 0,
        premisesGenerated: 0
      }
    });
  }

  async applyRules(premise, rules, context) {
    Object.assign(this.resourcesUsed, {
      rulesApplied: 0,
      tasksGenerated: 0,
      premisesGenerated: 0
    });

    const applicableRules = this.winnowingEnabled
      ? this.winnowing.filterRules(premise, rules)
      : this.simpleEvaluator.evaluate(premise, rules);

    for (const rule of applicableRules) {
      if (!rule.enabled) continue;

      if (this.resourcesUsed.rulesApplied >= (context.maxRulesPerDerivation || 10)) break;

      const startTime = Date.now();
      try {
        const success = await this._applyRule(rule, premise, context);
        rule.updatePerformance(success, Date.now() - startTime);
        this.resourcesUsed.rulesApplied++;
      } catch (error) {
        console.error(`Error applying rule ${rule.id}:`, error);
        rule.updatePerformance(false, Date.now() - startTime);
      }
    }

    return {
      premises: [...this.premiseBuffer],
      tasks: [...this.taskBuffer]
    };
  }

  async _applyRule(rule, premise, context) {
    const results = await rule.apply(premise, context);

    if (!results || !Array.isArray(results) || results.length === 0) return true;

    results.forEach(result => {
      this._isPremise(result) ? this._addPremiseToBuffer(result) : this._isTask(result) && this._addTaskToBuffer(result);
    });

    return true;
  }

  _isPremise(obj) {
    return obj && typeof obj === 'object' && obj.hasOwnProperty('type') && obj.constructor.name.includes('Premise');
  }

  _isTask(obj) {
    return obj instanceof Task || (obj && obj.hasOwnProperty('punctuation') && obj.hasOwnProperty('term'));
  }

  _addPremiseToBuffer(premise) {
    if (this.resourcesUsed.premisesGenerated < this.maxNewPremises) {
      this.premiseBuffer.push(premise);
      this.resourcesUsed.premisesGenerated++;
    }
  }

  _addTaskToBuffer(task) {
    if (this.resourcesUsed.tasksGenerated < this.maxNewTasks) {
      this.taskBuffer.push(task);
      this.resourcesUsed.tasksGenerated++;
    }
  }

  clearBuffers() {
    Object.assign(this, {
      premiseBuffer: [],
      taskBuffer: [],
      resourcesUsed: {
        rulesApplied: 0,
        tasksGenerated: 0,
        premisesGenerated: 0
      }
    });
  }

  getStats() {
    return {
      ...this.resourcesUsed,
      premisesInBuffer: this.premiseBuffer.length,
      tasksInBuffer: this.taskBuffer.length
    };
  }
}