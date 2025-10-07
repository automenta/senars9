/**
 * @file: core/Rules.js
 * @description: Optimized rules engine with winnowing for fast, condition-based rule selection and execution.
 * @module Rules
 */

import Component from './Component.js';

class Rules extends Component {
  constructor() {
    super();
    this.rules = new Map();
    this.ruleIndex = new Map(); // For fast lookup by type/category
  }

  /**
   * Initializes the Rules engine.
   * @param {object} config - The configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.rules.clear();
    this.ruleIndex.clear();
  }

  /**
   * Adds an inference rule to the engine.
   * @param {object} rule - The rule object to add.
   */
  addRule(rule) {
    if (!rule || !rule.id) {
      throw new Error('Rule must have an ID.');
    }
    if (this.rules.has(rule.id)) {
      console.warn(`Rule with ID "${rule.id}" already exists. Overwriting.`);
    }
    this.rules.set(rule.id, rule);
    this._indexRule(rule);
  }

  /**
   * Retrieves a rule by its ID.
   * @param {string} ruleId - The ID of the rule to retrieve.
   * @returns {object|undefined} The rule object or undefined if not found.
   */
  getRule(ruleId) {
    return this.rules.get(ruleId);
  }

  /**
   * Removes a rule from the engine.
   * @param {string} ruleId - The ID of the rule to remove.
   */
  removeRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this._deindexRule(rule);
      this.rules.delete(ruleId);
    }
  }

  /**
   * Finds all rules that are applicable to a given task based on pre-filtering (winnowing).
   * @param {object} task - The task to find applicable rules for.
   * @returns {Array<object>} A list of applicable rules, prioritized.
   */
  findApplicableRules(task) {
    // This is a simplified winnowing. A real implementation would be more complex.
    const applicable = [];
    for (const rule of this.rules.values()) {
      // Example condition: rule is applicable if the task term type matches a condition in the rule.
      if (this._isRuleApplicable(rule, task)) {
        applicable.push(rule);
      }
    }
    return this._prioritizeRules(applicable);
  }

  /**
   * Executes the most applicable rules for a set of tasks.
   * @param {Array<object>} tasks - The tasks to apply rules to.
   * @param {object} context - The reasoning context.
   * @returns {Array<object>} A list of derived tasks.
   */
  executeRules(tasks, context = {}) {
    const derivedTasks = [];
    for (const task of tasks) {
      const applicableRules = this.findApplicableRules(task);
      for (const rule of applicableRules) {
        if (rule.apply) {
          const result = rule.apply([task], context);
          if (result) {
            derivedTasks.push(...result);
          }
        }
      }
    }
    return derivedTasks;
  }

  /**
   * Indexes a rule for faster retrieval.
   * @param {object} rule - The rule to index.
   * @private
   */
  _indexRule(rule) {
    // Example indexing by category
    if (rule.categories) {
      for (const category of rule.categories) {
        if (!this.ruleIndex.has(category)) {
          this.ruleIndex.set(category, new Set());
        }
        this.ruleIndex.get(category).add(rule.id);
      }
    }
  }

  /**
   * Removes a rule from the index.
   * @param {object} rule - The rule to de-index.
   * @private
   */
  _deindexRule(rule) {
    if (rule.categories) {
      for (const category of rule.categories) {
        if (this.ruleIndex.has(category)) {
          this.ruleIndex.get(category).delete(rule.id);
        }
      }
    }
  }

  /**
   * Determines if a rule is applicable to a task.
   * @param {object} rule - The rule to check.
   * @param {object} task - The task to check against.
   * @returns {boolean} True if the rule is applicable.
   * @private
   */
  _isRuleApplicable(rule, task) {
    // Placeholder for actual applicability logic (e.g., matching term structure)
    return rule.premises && rule.premises.some(p => p.type === task.term.type);
  }

  /**
   * Prioritizes a list of rules.
   * @param {Array<object>} rules - The rules to prioritize.
   * @returns {Array<object>} The prioritized list of rules.
   * @private
   */
  _prioritizeRules(rules) {
    // Sort by priority (higher first), then complexity (lower first)
    return rules.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.complexity || 0) - (b.complexity || 0);
    });
  }
}

export default Rules;