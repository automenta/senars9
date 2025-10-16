import { glob } from 'glob';
console.log('glob imported in Reasoner.js:', glob);
import path from 'path';
import { Logger } from '../base/utilities.js';

/**
 * Manages the loading, initialization, and application of reasoning rules.
 */
export class Reasoner {
  constructor(dependencies = {}, config = {}) {
    this.dependencies = dependencies;
    this.rules = new Map();
    this.enabledRuleIds = new Set();
    this.performanceMetrics = new Map();
    this.config = {
      enableMetrics: true,
      ...config,
    };
  }

  /**
   * Loads rules from a specified directory, initializes them with dependencies, and adds them to the manager.
   * @param {string} ruleDir - The directory containing rule files.
   */
  async loadRulesFrom(ruleDir) {
    const ruleFiles = await glob(`${ruleDir}/*.js`);
    Logger.info(`Found ${ruleFiles.length} rule files in ${path.basename(ruleDir)}.`);

    for (const file of ruleFiles) {
      if (path.basename(file) === 'index.js' || path.basename(file).includes('Helpers')) continue;

      try {
        const module = await import(file);
        const RuleClass = Object.values(module).find(v => typeof v === 'function' && v.name.endsWith('Rule'));

        if (RuleClass) {
          const rule = new RuleClass(this.dependencies);
          this.addRule(rule);
          Logger.info(`Loaded rule: ${rule.id}`);
        } else {
          Logger.warn(`No valid Rule class found in ${file}`);
        }
      } catch (error) {
        Logger.error(`Failed to load rule from ${file}:`, error);
      }
    }
  }

  addRule(rule) {
    if (!rule?.id) throw new Error('Rule must have an ID.');
    this.rules.set(rule.id, rule);
    if (rule.enabled) {
      this.enabledRuleIds.add(rule.id);
    }
    if (this.config.enableMetrics) {
      this._initMetrics(rule.id);
    }
  }

  enable(ruleId) { this.enabledRuleIds.add(ruleId); }
  disable(ruleId) { this.enabledRuleIds.delete(ruleId); }

  getEnabledRules() {
    return Array.from(this.enabledRuleIds).map(id => this.rules.get(id)).filter(Boolean);
  }

  /**
   * The core reasoning method that will be implemented.
   * This is a placeholder for the actual reasoning logic.
   */
  async reason(focusSet, memory, context) {
    const allDerivedTasks = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
        if (rule.canApply && rule.canApply(focusSet, memory, context)) {
            const derivedTasks = await rule.apply(focusSet, memory, context);
            if (derivedTasks) {
                allDerivedTasks.push(...derivedTasks);
            }
        }
    }

    return allDerivedTasks;
  }

  _initMetrics(ruleId) {
    this.performanceMetrics.set(ruleId, {
      executions: 0,
      successes: 0,
      avgTime: 0,
      lastRun: null,
    });
  }

  // ... other methods like updateMetrics, getStats etc. can be kept or refactored ...
}