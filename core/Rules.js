import Component from './Component.js';
import { Storage, IndexManager } from './collections.js';
import { Logger, ObjectUtils, ArrayUtils } from './utilities.js';
import { Validation } from './validation.js';
import { COMPLEXITY_LEVELS, MAX_PRIORITY } from './constants.js';

class Rules extends Component {
  constructor() {
    super();
    this.rules = [];
    this.indexes = new IndexManager();
    this.preFilters = new Set();
    this.lastEvaluationTime = null;
    this.evaluationTimeHistory = [];
    this.maxHistorySize = 100;
  }

  async _doInitialize() {
    this.rules = [];
    this.indexes.clear();
    this.preFilters.clear();
  }

  add(rule) {
    Validation.requireProps(rule, ['name', 'condition', 'action']);

    this.rules.push({
      priority: 0,
      type: 'general',
      complexity: 'simple',
      preFilterTags: [],
      ...rule
    });

    this._updateIndexes(this.rules[this.rules.length - 1]);
  }

  remove(name) {
    const index = this.rules.findIndex(rule => rule.name === name);
    if (index !== -1) {
      const rule = this.rules[index];
      this.rules.splice(index, 1);
      this._removeFromIndexes(rule);
    }
  }

  _updateIndexes(rule) {
    this.indexes.add(rule.type, rule.name);
    this.indexes.add(`complexity_${rule.complexity}`, rule.name);
    this.indexes.add(`priority_${rule.priority}`, rule.name);

    rule.preFilterTags?.forEach(tag => {
      this.preFilters.add(tag);
      this.indexes.add(`prefilter_${tag}`, rule.name);
    });
  }

  _removeFromIndexes(rule) {
    this.indexes.remove(rule.type, rule.name);
    rule.preFilterTags?.length > 0 && this._cleanupPreFilters();
  }

  _cleanupPreFilters() {
    this.preFilters = new Set(this.rules.flatMap(rule => rule.preFilterTags || []));
  }

  find(predicate) {
    return this.rules.filter(predicate);
  }

  getRulesByType(type) {
    return this.indexes.get(type);
  }

  getRulesByComplexity(complexity) {
    return this.indexes.get(`complexity_${complexity}`) || [];
  }

  getRulesByPriority(priority) {
    return this.indexes.get(`priority_${priority}`) || [];
  }

  getRulesByPreFilterTag(tag) {
    return this.indexes.get(`prefilter_${tag}`) || [];
  }

  getOptimizedRuleCandidates(context, options = {}) {
    let candidates = options.ruleType ? this.getRulesByType(options.ruleType) : this.rules;

    if (options.maxComplexity) {
      const maxLevel = COMPLEXITY_LEVELS[options.maxComplexity] || COMPLEXITY_LEVELS.complex;
      const complexityCandidates = new Set();

      for (let level = 1; level <= maxLevel; level++) {
        const levelName = Object.keys(COMPLEXITY_LEVELS).find(key => COMPLEXITY_LEVELS[key] === level);
        if (levelName) {
          this.getRulesByComplexity(levelName).forEach(rule => complexityCandidates.add(rule));
        }
      }

      candidates = candidates.filter(rule => complexityCandidates.has(rule));
    }

    return this._preFilterRules(candidates, context);
  }

  getStats() {
    const types = Array.from(this.indexes.indexes.keys());
    const totalRules = this.rules.length;
    const preFilterTags = this.preFilters.size;

    return {
      totalRules,
      types,
      preFilterTags,
      averageRulesPerType: totalRules / Math.max(types.length, 1),
      indexesSize: this.indexes.indexes.size,
      rulesByComplexity: this._getRulesByComplexityStats(),
      rulesByPriority: this._getRulesByPriorityStats(),
      performance: {
        lastEvaluation: this.lastEvaluationTime,
        averageEvaluationTime: this.evaluationTimeHistory.length > 0
          ? this.evaluationTimeHistory.reduce((a, b) => a + b, 0) / this.evaluationTimeHistory.length
          : 0
      }
    };
  }

  _getRulesByComplexityStats() {
    const stats = {};
    for (const rule of this.rules) {
      stats[rule.complexity] = (stats[rule.complexity] || 0) + 1;
    }
    return stats;
  }

  _getRulesByPriorityStats() {
    const stats = {};
    for (const rule of this.rules) {
      const priority = rule.priority || 0;
      stats[priority] = (stats[priority] || 0) + 1;
    }
    return stats;
  }

  clear() {
    this.rules = [];
    this.indexes.clear();
    this.preFilters.clear();
  }

  async evaluate(context, options = {}) {
    const startTime = Date.now();

    try {
      let candidates = this.getOptimizedRuleCandidates(context, options);

      const applicableRules = candidates.filter(rule => {
        try {
          return rule.condition(context);
        } catch (error) {
          this.core?.messages?.emit('error:occurred', {
            type: 'RuleConditionError',
            rule: rule.name,
            error: error.message,
            stack: error.stack
          }) || Logger.error(`Rule '${rule.name}' condition failed`, { rule: rule.name, error: error.message });
          return false;
        }
      });

      if (applicableRules.length === 0) {
        this._recordEvaluationTime(Date.now() - startTime);
        return null;
      }

      this._sortByPriority(applicableRules);

      const topRule = applicableRules[0];
      try {
        const result = await topRule.action(context);
        this._recordEvaluationTime(Date.now() - startTime);

        if (this.core?.messages) {
          this.core.messages.emit('rules:evaluated', {
            ruleCount: candidates.length,
            applicableCount: applicableRules.length,
            selectedRule: topRule.name,
            duration: Date.now() - startTime,
            success: true,
            timestamp: new Date()
          });
        }

        return result;
      } catch (error) {
        this.core?.messages?.emit('error:occurred', {
          type: 'RuleActionError',
          rule: topRule.name,
          error: error.message,
          stack: error.stack
        }) || Logger.error(`Rule '${topRule.name}' action failed`, { rule: topRule.name, error: error.message });

        this._recordEvaluationTime(Date.now() - startTime);
        return null;
      }
    } catch (error) {
      this._recordEvaluationTime(Date.now() - startTime);
      throw error;
    }
  }

  _recordEvaluationTime(duration) {
    this.lastEvaluationTime = duration;
    this.evaluationTimeHistory.push(duration);

    // Keep history size manageable
    if (this.evaluationTimeHistory.length > this.maxHistorySize) {
      this.evaluationTimeHistory = this.evaluationTimeHistory.slice(-this.maxHistorySize);
    }
  }

  _applyFilters(rules, context, filters) {
    let filtered = rules;
    if (filters.preFilter) filtered = this._preFilterRules(filtered, context);
    if (filters.ruleType) filtered = this._filterByType(filtered, filters.ruleType);
    if (filters.maxComplexity) filtered = this._filterByComplexity(filtered, filters.maxComplexity);
    return filtered;
  }

  _preFilterRules(rules, context) {
    if (rules.length === 0) return rules;

    const contextKeys = Object.keys(context);
    if (contextKeys.length === 0) return rules;

    return rules.filter(rule => {
      const tags = rule.preFilterTags || [];
      return tags.length === 0 || tags.some(tag => contextKeys.includes(tag));
    });
  }

  _filterByType(rules, type) {
    const typeRules = this.indexes.get(type);
    return rules.filter(rule => typeRules.includes(rule));
  }

  _filterByComplexity(rules, maxComplexity) {
    const maxLevel = COMPLEXITY_LEVELS[maxComplexity] || COMPLEXITY_LEVELS.complex;
    return rules.filter(rule => (COMPLEXITY_LEVELS[rule.complexity] || 1) <= maxLevel);
  }

  _sortByPriority(rules) {
    rules.sort((a, b) => {
      // Primary sort: priority (higher first)
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort: complexity (simpler first for faster execution)
      const complexityDiff = COMPLEXITY_LEVELS[a.complexity] - COMPLEXITY_LEVELS[b.complexity];
      if (complexityDiff !== 0) return complexityDiff;

      // Tertiary sort: rule name for deterministic ordering
      return a.name.localeCompare(b.name);
    });
  }
}

export default Rules;