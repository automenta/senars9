import { Logger } from './base/utilities.js';
import { DEFAULTS } from './base/constants.js';
import { Component } from './components/Component.js';
import { RuleApplicationEngine } from './reasoning/RuleApplicationEngine.js';
import { RuleManager } from './reasoning/RuleManager.js';
import path from 'path';
import { loadRules, validateLoadedRules } from './reasoning/RuleLoader.js';
import { RuleFactory } from './reasoning/RuleFactory.js';

export class Reasoner extends Component {
  constructor(lm = null, config = {}) {
    super();
    this.lm = lm;
    this.ruleManager = new RuleManager(config);
    this.applicationEngine = new RuleApplicationEngine(this);
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;
    if (config.rulePath) {
      await this._loadReasoningRules(config.rulePath, config.lm);
    }
  }

  async _loadReasoningRules(rulePath, lm) {
    const lmRules = await this._loadLMRules(rulePath, lm);
    const nalRules = this._loadNALRules();

    const allRules = [...lmRules, ...nalRules];
    this._registerRules(allRules);
  }

  async _loadLMRules(rulePath, lm) {
    const lmRuleDir = path.join(rulePath, 'lm', 'rules');
    const lmRules = await loadRules(lmRuleDir, { lm });
    const { valid, invalidCount } = validateLoadedRules(lmRules);
    if (invalidCount > 0) {
      Logger.warn(`LM rule validation issues: ${invalidCount} invalid rules found`);
    }
    return valid;
  }

  _loadNALRules() {
    const nalRuleTypes = RuleFactory.getAvailableNALRules();
    const nalRules = [];
    const nalErrors = [];

    for (const type of nalRuleTypes) {
      try {
        const rule = RuleFactory.createNALRule(type);
        nalRules.push(rule);
      } catch (error) {
        Logger.error(`Failed to create NAL rule of type ${type}:`, error.message);
        nalErrors.push({ type, error: error.message });
      }
    }

    const { valid, invalidCount } = validateLoadedRules(nalRules);
    if (invalidCount > 0) {
        Logger.warn(`NAL rule validation issues: ${invalidCount} invalid rules found`);
    }

    if (nalErrors.length > 0) {
        Logger.error(`Failed to create ${nalErrors.length} NAL rules:`, nalErrors);
    }

    return valid;
  }

  _registerRules(rules) {
    let successfullyAdded = 0;
    for (const rule of rules) {
      try {
        this.addRule(rule);
        successfullyAdded++;
      } catch (error) {
        Logger.error(`Failed to add rule ${rule.id}:`, error.message);
      }
    }
    Logger.info(`Registered ${successfullyAdded} rules`);
  }

  addRule(rule, group = 'general') {
    this.ruleManager.addRule(rule, group);
  }

  enable(idOrGroup) { this.ruleManager.enable(idOrGroup); }
  disable(idOrGroup) { this.ruleManager.disable(idOrGroup); }
  disableAllRules() { this.ruleManager.disableAllRules(); }

  updateMetrics(ruleId, success, time, error = null) {
    this.ruleManager.updateMetrics(ruleId, success, time, error);
  }

  getEnabledRules() {
    return this.ruleManager.getEnabledRules();
  }

  getRulesByType(type) {
    return this.ruleManager.getRulesByType(type);
  }

  getStats() {
    return this.ruleManager.getStats();
  }

  getRuleValidationStatus(ruleId) {
    return this.ruleManager.getRuleValidationStatus(ruleId);
  }

  validateAllRules() {
    return this.ruleManager.validateAllRules();
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