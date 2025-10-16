import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';
import { RuleApplicationEngine } from './reasoning/RuleApplicationEngine.js';

export class NALRule {
  getTriggerTermType() { throw new Error('getTriggerTermType must be implemented by subclasses'); }
  apply(context) { throw new Error('apply must be implemented by subclasses'); }
  canApply(context) { return true; }
}

export class Reasoner extends Component {
  constructor(lm = null, config = {}) {
    super();

    this.lm = lm;
    this.rules = new Map();
    this.ruleGroups = new Map();
    this.enabledRuleIds = new Set();
    this.performanceMetrics = new Map();
    this.ruleValidation = new Map();
    this.config = {
      enableMetrics: true,
      enableGroups: true,
      enableValidation: true,
      maxRules: 1000,
      validateOnAdd: true,
      ...config
    };

    this.applicationEngine = new RuleApplicationEngine(this);
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;
  }

  addRule(rule, group = 'general') {
    if (!rule?.id) {
      const error = new Error('Invalid rule: must have an ID');
      Logger.error('Rule registration failed:', error.message);
      throw error;
    }

    if (this.rules.size >= this.config.maxRules) {
      const error = new Error(`Maximum rule limit (${this.config.maxRules}) reached`);
      Logger.error('Rule registration failed:', error.message);
      throw error;
    }

    // Validate rule structure
    if (this.config.enableValidation && this.config.validateOnAdd) {
      try {
        this._validateRule(rule);
      } catch (validationError) {
        Logger.error(`Rule validation failed for rule ${rule.id}:`, validationError.message);
        throw validationError;
      }
    }

    this.rules.set(rule.id, rule);
    this.config.enableGroups && this._updateGroups(rule.id, group);
    // Ensure enabled state is properly set - default to true if not specified
    const shouldBeEnabled = rule.enabled !== false;
    if (shouldBeEnabled) {
      this.enabledRuleIds.add(rule.id);
    } else {
      this.enabledRuleIds.delete(rule.id); // Explicitly disable if enabled is explicitly false
    }
    this.config.enableMetrics && this._initMetrics(rule.id);

    // Track rule type for better organization
    this._trackRuleType(rule);

    Logger.debug(`Rule added: ${rule.id} to group ${group}, enabled: ${shouldBeEnabled}`);
  }

  enable(idOrGroup) { this._toggle(idOrGroup, true); }
  disable(idOrGroup) { this._toggle(idOrGroup, false); }

  _toggle(idOrGroup, enable) {
    const ruleIds = this.rules.has(idOrGroup)
      ? [idOrGroup]
      : this.ruleGroups.get(idOrGroup) || [];
    ruleIds.forEach(id => enable ? this.enabledRuleIds.add(id) : this.enabledRuleIds.delete(id));
  }

  disableAllRules() {
    this.enabledRuleIds.clear();
  }

  _updateGroups(ruleId, group) {
    if (!this.config.enableGroups) return;
    const groupSet = this.ruleGroups.get(group) || new Set();
    groupSet.add(ruleId);
    this.ruleGroups.set(group, groupSet);
  }

  _initMetrics(ruleId) {
    this.performanceMetrics.set(ruleId, {
      executions: 0,
      successes: 0,
      failures: 0,
      avgTime: 0,
      lastRun: null,
      lastError: null
    });
  }

  _validateRule(rule) {
    const errors = [];

    if (!rule.id || typeof rule.id !== 'string') {
      errors.push('Rule must have a valid string ID');
    }

    if (this.rules.has(rule.id)) {
      errors.push(`Rule with ID '${rule.id}' already exists`);
    }

    if (typeof rule.apply !== 'function') {
      errors.push('Rule must have an apply method');
    }

    if (rule.type && !['nal', 'lm', 'general'].includes(rule.type)) {
      errors.push(`Rule type must be 'nal', 'lm', or 'general', got '${rule.type}'`);
    }

    // Additional validation for NAL rules (only if they don't have a basic apply method)
    if (rule.type === 'nal' && typeof rule.apply !== 'function') {
      // NAL rules can use performInference as an alternative to apply
      if (typeof rule.performInference !== 'function') {
        errors.push('NAL rule must have either performInference or apply method');
      }
    }

    // Additional validation for LM rules (only if they don't have a basic apply method)
    if (rule.type === 'lm' && typeof rule.apply !== 'function') {
      // LM rules can use executeLM as an alternative to apply
      if (typeof rule.executeLM !== 'function') {
        errors.push('LM rule must have either executeLM or apply method');
      }
    }

    if (errors.length > 0) {
      const error = new Error(`Rule validation failed: ${errors.join(', ')}`);
      Logger.error('Rule validation failed:', error.message);
      throw error;
    }

    this.ruleValidation.set(rule.id, { validated: true, timestamp: Date.now(), errors: [] });
  }

  _trackRuleType(rule) {
    if (!rule.type) return;

    const typeSet = this.ruleGroups.get(`type:${rule.type}`) || new Set();
    typeSet.add(rule.id);
    this.ruleGroups.set(`type:${rule.type}`, typeSet);
  }

  updateMetrics(ruleId, success, time, error = null) {
    if (!this.config.enableMetrics) return;

    const metrics = this.performanceMetrics.get(ruleId);
    if (!metrics) return;

    metrics.executions++;
    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
      if (error) {
        metrics.lastError = error;
      }
    }
    metrics.avgTime = (metrics.avgTime * (metrics.executions - 1) + time) / metrics.executions;
    metrics.lastRun = Date.now();
  }

  getEnabledRules() {
    return Array.from(this.enabledRuleIds).map(id => this.rules.get(id)).filter(Boolean);
  }

  getRulesByType(type) {
    return Array.from(this.rules.values()).filter(rule => rule.type === type);
  }

  getStats() {
    const ruleTypes = [...new Set(Array.from(this.rules.values()).map(r => r.type).filter(Boolean))];
    const typeCounts = {};

    ruleTypes.forEach(type => {
      const typeGroup = this.ruleGroups.get(`type:${type}`);
      typeCounts[type] = typeGroup ? typeGroup.size : 0;
    });

    return {
      totalRules: this.rules.size,
      enabledRules: this.enabledRuleIds.size,
      ruleTypes,
      ruleTypeCounts: typeCounts,
      ruleGroups: Array.from(this.ruleGroups.keys()),
      validationEnabled: this.config.enableValidation,
      validatedRules: this.ruleValidation.size,
      performance: this._aggregateMetrics()
    };
  }

  getRulesByType(type) {
    const typeGroup = this.ruleGroups.get(`type:${type}`);
    if (!typeGroup) return [];
    return Array.from(typeGroup).map(id => this.rules.get(id)).filter(Boolean);
  }

  getRuleValidationStatus(ruleId) {
    return this.ruleValidation.get(ruleId) || { validated: false };
  }

  validateAllRules() {
    const results = [];
    for (const [id, rule] of this.rules) {
      try {
        this._validateRule(rule);
        results.push({ id, status: 'valid' });
      } catch (error) {
        results.push({ id, status: 'invalid', error: error.message });
      }
    }
    return results;
  }

  _aggregateMetrics() {
    const stats = {
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      avgExecutionTime: 0,
      successRate: 0
    };
    let count = 0;

    for (const metrics of this.performanceMetrics.values()) {
      stats.totalExecutions += metrics.executions;
      stats.totalSuccesses += metrics.successes;
      stats.totalFailures += metrics.failures;
      stats.avgExecutionTime += metrics.avgTime;
      count++;
    }

    stats.avgExecutionTime = count > 0 ? stats.avgExecutionTime / count : 0;
    stats.successRate = stats.totalExecutions > 0
      ? (stats.totalSuccesses / stats.totalExecutions) * 100
      : 0;

    return stats;
  }

  async reason(focusSet, memory, context) {
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

  async reasonWithTrace(focusSet, memory, context) {
    const trace = [];
    const originalReason = this.reason.bind(this);

    // Wrap the reason method to capture tracing information
    this.reason = async function(focusSet, memory, context) {
      const derivedTasks = [];
      const enabledRules = this.getEnabledRules();

      for (const rule of enabledRules) {
        const ruleStartTime = Date.now();
        const ruleResults = [];

        for (const premise of focusSet) {
          try {
            const result = await rule.apply({ premise, memory, context });
            if (result && result.length > 0) {
              ruleResults.push(...result);
            }
          } catch (error) {
            trace.push({
              type: 'rule_error',
              ruleId: rule.id,
              error: error.message,
              timestamp: Date.now()
            });
          }
        }

        const ruleEndTime = Date.now();
        if (ruleResults.length > 0) {
          derivedTasks.push(...ruleResults);
          trace.push({
            type: 'rule_success',
            ruleId: rule.id,
            derivedCount: ruleResults.length,
            executionTime: ruleEndTime - ruleStartTime,
            timestamp: Date.now()
          });
        }
      }

      return derivedTasks;
    }.bind(this);

    const derivedTasks = await this.reason(focusSet, memory, context);

    // Restore original reason method
    this.reason = originalReason;

    return { derivedTasks, trace };
  }
}