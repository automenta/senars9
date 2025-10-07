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
    this.ruleIndex = new Map(); // Fast lookup by type and complexity
    this.preFilters = new Set(); // Pre-filtering for common conditions
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
   * Adds a rule to the system with enhanced indexing and pre-filtering.
   * @param {object} rule - The rule object to add.
   * @param {string} rule.name - The name of the rule.
   * @param {Function} rule.condition - A function that returns true if the rule should be considered.
   * @param {Function} rule.action - A function to execute if the rule is selected.
   * @param {number} [rule.priority=0] - The priority of the rule.
   * @param {string} [rule.type='general'] - The type/category of the rule for indexing.
   * @param {string} [rule.complexity='simple'] - The complexity level ('simple', 'medium', 'complex').
   * @param {Array<string>} [rule.preFilterTags=[]] - Tags for pre-filtering optimization.
   */
  add(rule) {
    if (!rule || !rule.name || !rule.condition || !rule.action) {
      throw new Error('Rule must have a name, condition, and action.');
    }

    const enhancedRule = {
      priority: 0,
      type: 'general',
      complexity: 'simple',
      preFilterTags: [],
      ...rule
    };

    this.rules.push(enhancedRule);
    this._updateIndexes(enhancedRule);
  }

  /**
   * Removes a rule by its name and updates indexes.
   * @param {string} name - The name of the rule to remove.
   */
  remove(name) {
    const ruleIndex = this.rules.findIndex(rule => rule.name === name);
    if (ruleIndex !== -1) {
      const rule = this.rules[ruleIndex];
      this.rules.splice(ruleIndex, 1);
      this._removeFromIndexes(rule);
    }
  }

  /**
   * Updates internal indexes when adding a rule.
   * @private
   */
  _updateIndexes(rule) {
    // Type index
    if (!this.ruleIndex.has(rule.type)) {
      this.ruleIndex.set(rule.type, new Set());
    }
    this.ruleIndex.get(rule.type).add(rule);

    // Pre-filter tags
    rule.preFilterTags?.forEach(tag => this.preFilters.add(tag));
  }

  /**
   * Removes rule from internal indexes.
   * @private
   */
  _removeFromIndexes(rule) {
    // Remove from type index
    if (this.ruleIndex.has(rule.type)) {
      this.ruleIndex.get(rule.type).delete(rule);
      if (this.ruleIndex.get(rule.type).size === 0) {
        this.ruleIndex.delete(rule.type);
      }
    }

    // Clean up unused pre-filter tags
    if (rule.preFilterTags?.length > 0) {
      this._cleanupPreFilters();
    }
  }

  /**
   * Cleans up unused pre-filter tags.
   * @private
   */
  _cleanupPreFilters() {
    const usedTags = new Set();
    this.rules.forEach(rule => {
      rule.preFilterTags?.forEach(tag => usedTags.add(tag));
    });
    this.preFilters = usedTags;
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
   * Gets rules by type using the index.
   * @param {string} type - The type of rules to retrieve.
   * @returns {Array<object>} A list of rules of the specified type.
   */
  getRulesByType(type) {
    return this.ruleIndex.has(type) ? Array.from(this.ruleIndex.get(type)) : [];
  }

  /**
   * Gets statistics about the rule system.
   * @returns {object} Statistics including total rules, types, and performance metrics.
   */
  getStats() {
    const types = Array.from(this.ruleIndex.keys());
    const totalRules = this.rules.length;
    const preFilterTags = this.preFilters.size;

    return {
      totalRules,
      types,
      preFilterTags,
      averageRulesPerType: totalRules / Math.max(types.length, 1)
    };
  }

  /**
   * Clears all rules and resets indexes.
   */
  clear() {
    this.rules = [];
    this.ruleIndex.clear();
    this.preFilters.clear();
  }

  /**
   * Evaluates the rules against a given context with enhanced pre-filtering and indexing.
   * @param {object} context - The context object to evaluate rules against.
   * @param {object} [options={}] - Evaluation options.
   * @param {string} [options.ruleType] - Filter by specific rule type.
   * @param {string} [options.maxComplexity] - Maximum complexity level ('simple', 'medium', 'complex').
   * @returns {Promise<any>} The result of the executed rule's action, or null if no rule was executed.
   */
  async evaluate(context, options = {}) {
    let candidateRules = [...this.rules];

    // 1. Pre-filtering: Quick elimination using tags and context properties
    candidateRules = this._preFilterRules(candidateRules, context);

    // 2. Type filtering: Use indexes for fast type-based filtering
    if (options.ruleType) {
      candidateRules = this._filterByType(candidateRules, options.ruleType);
    }

    // 3. Complexity filtering: Filter by maximum complexity
    if (options.maxComplexity) {
      candidateRules = this._filterByComplexity(candidateRules, options.maxComplexity);
    }

    // 4. Condition evaluation: Final filtering based on rule conditions
    const applicableRules = candidateRules.filter(rule => {
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

    // 5. Enhanced prioritization: Sort by priority and complexity
    this._sortByPriority(applicableRules);

    // 6. Execution: Execute the highest-priority rule
    const topRule = applicableRules[0];
    try {
      return await topRule.action(context);
    } catch (error) {
      console.error(`Error in rule '${topRule.name}' action:`, error);
      return null;
    }
  }

  /**
   * Pre-filters rules using fast tag-based elimination.
   * @private
   */
  _preFilterRules(rules, context) {
    // Quick check: if context has no relevant properties, return all rules
    const contextKeys = Object.keys(context);
    if (contextKeys.length === 0) return rules;

    return rules.filter(rule => {
      // If rule has no pre-filter tags, it passes pre-filtering
      if (!rule.preFilterTags || rule.preFilterTags.length === 0) {
        return true;
      }

      // Check if any of the rule's tags match context properties
      return rule.preFilterTags.some(tag => contextKeys.includes(tag));
    });
  }

  /**
   * Filters rules by type using indexes.
   * @private
   */
  _filterByType(rules, type) {
    if (this.ruleIndex.has(type)) {
      return Array.from(this.ruleIndex.get(type)).filter(rule => rules.includes(rule));
    }
    return [];
  }

  /**
   * Filters rules by maximum complexity level.
   * @private
   */
  _filterByComplexity(rules, maxComplexity) {
    const complexityLevels = { 'simple': 1, 'medium': 2, 'complex': 3 };
    const maxLevel = complexityLevels[maxComplexity] || 3;

    return rules.filter(rule => {
      const ruleLevel = complexityLevels[rule.complexity] || 1;
      return ruleLevel <= maxLevel;
    });
  }

  /**
   * Enhanced sorting by priority and complexity.
   * @private
   */
  _sortByPriority(rules) {
    const complexityLevels = { 'simple': 1, 'medium': 2, 'complex': 3 };

    rules.sort((a, b) => {
      // Primary sort: priority (descending)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Secondary sort: complexity (ascending - simpler rules first for same priority)
      const aLevel = complexityLevels[a.complexity] || 1;
      const bLevel = complexityLevels[b.complexity] || 1;
      return aLevel - bLevel;
    });
  }
}

export default Rules;