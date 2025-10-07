import Component from './Component.js';
import { Index, Storage } from './Utils.js';

class Rules extends Component {
  constructor() {
    super();
    this.rules = [];
    this.indexes = new Index();
    this.preFilters = new Set();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.rules = [];
    this.indexes.clear();
    this.preFilters.clear();
  }

  add(rule) {
    if (!rule?.name || !rule?.condition || !rule?.action) {
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

  remove(name) {
    const index = this.rules.findIndex(rule => rule.name === name);
    if (index !== -1) {
      const rule = this.rules[index];
      this.rules.splice(index, 1);
      this._removeFromIndexes(rule);
    }
  }

  _updateIndexes(rule) {
    this.indexes.add(rule.type, rule.name, rule);
    rule.preFilterTags?.forEach(tag => this.preFilters.add(tag));
  }

  _removeFromIndexes(rule) {
    this.indexes.remove(rule.type, rule.name);
    if (rule.preFilterTags?.length > 0) {
      this._cleanupPreFilters();
    }
  }

  _cleanupPreFilters() {
    const usedTags = new Set();
    this.rules.forEach(rule => {
      rule.preFilterTags?.forEach(tag => usedTags.add(tag));
    });
    this.preFilters = usedTags;
  }

  find(predicate) {
    return this.rules.filter(predicate);
  }

  getRulesByType(type) {
    return this.indexes.get(type);
  }

  getStats() {
    const types = Array.from(this.indexes.indexes.keys());
    const totalRules = this.rules.length;
    const preFilterTags = this.preFilters.size;

    return {
      totalRules,
      types,
      preFilterTags,
      averageRulesPerType: totalRules / Math.max(types.length, 1)
    };
  }

  clear() {
    this.rules = [];
    this.indexes.clear();
    this.preFilters.clear();
  }

  async evaluate(context, options = {}) {
    let candidates = [...this.rules];

    candidates = this._preFilterRules(candidates, context);
    if (options.ruleType) candidates = this._filterByType(candidates, options.ruleType);
    if (options.maxComplexity) candidates = this._filterByComplexity(candidates, options.maxComplexity);

    const applicableRules = candidates.filter(rule => {
      try {
        return rule.condition(context);
      } catch (error) {
        console.error(`Error in rule '${rule.name}' condition:`, error);
        return false;
      }
    });

    if (applicableRules.length === 0) return null;

    this._sortByPriority(applicableRules);

    const topRule = applicableRules[0];
    try {
      return await topRule.action(context);
    } catch (error) {
      console.error(`Error in rule '${topRule.name}' action:`, error);
      return null;
    }
  }

  _preFilterRules(rules, context) {
    const contextKeys = Object.keys(context);
    if (contextKeys.length === 0) return rules;

    return rules.filter(rule => {
      if (!rule.preFilterTags?.length) return true;
      return rule.preFilterTags.some(tag => contextKeys.includes(tag));
    });
  }

  _filterByType(rules, type) {
    const typeRules = this.indexes.get(type);
    return rules.filter(rule => typeRules.includes(rule));
  }

  _filterByComplexity(rules, maxComplexity) {
    const levels = { 'simple': 1, 'medium': 2, 'complex': 3 };
    const maxLevel = levels[maxComplexity] || 3;

    return rules.filter(rule => (levels[rule.complexity] || 1) <= maxLevel);
  }

  _sortByPriority(rules) {
    const levels = { 'simple': 1, 'medium': 2, 'complex': 3 };

    rules.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return (levels[a.complexity] || 1) - (levels[b.complexity] || 1);
    });
  }
}

export default Rules;