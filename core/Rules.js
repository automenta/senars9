/**
 * @file: core/Rules.js
 * @description: Manages the registration, evaluation, and execution of rules using a winnowing-based approach.
 * @module Rules
 */

import Component from './Component.js';

class Rules extends Component {
  constructor() {
    super();
    this.rules = [];
  }

  /**
   * Initializes the Rules component.
   * @param {object} config - The component's configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.rules = [];
  }

  /**
   * Adds a rule to the system.
   * @param {object} rule - The rule object to add.
   * @param {string} rule.name - The name of the rule.
   * @param {Function} rule.condition - A function that returns true if the rule should be considered.
   * @param {Function} rule.action - A function to execute if the rule is selected.
   * @param {number} [rule.priority=0] - The priority of the rule.
   */
  add(rule) {
    if (!rule || !rule.name || !rule.condition || !rule.action) {
      throw new Error('Rule must have a name, condition, and action.');
    }
    this.rules.push({ priority: 0, ...rule });
  }

  /**
   * Removes a rule by its name.
   * @param {string} name - The name of the rule to remove.
   */
  remove(name) {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  /**
   * Finds all rules matching a given predicate.
   * @param {Function} predicate - A function to test each rule.
   * @returns {Array<object>} A list of matching rules.
   */
  find(predicate) {
    return this.rules.filter(predicate);
  }

  /**
   * Evaluates the rules against a given context, executing the highest-priority rule that meets its condition.
   * @param {object} context - The context object to evaluate rules against.
   * @returns {Promise<any>} The result of the executed rule's action, or null if no rule was executed.
   */
  async evaluate(context) {
    // 1. Winnowing: Filter rules based on the condition
    const applicableRules = this.rules.filter(rule => {
      try {
        return rule.condition(context);
      } catch (error) {
        console.error(`Error in rule '${rule.name}' condition:`, error);
        return false;
      }
    });

    if (applicableRules.length === 0) {
      return null; // No rules matched
    }

    // 2. Prioritization: Sort by priority (descending)
    applicableRules.sort((a, b) => b.priority - a.priority);

    // 3. Execution: Execute the highest-priority rule
    const topRule = applicableRules[0];
    try {
      return await topRule.action(context);
    } catch (error) {
      console.error(`Error in rule '${topRule.name}' action:`, error);
      return null;
    }
  }
}

export default Rules;