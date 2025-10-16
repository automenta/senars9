export class RuleManager {
  constructor(lm = null, config = {}) {
    this.lm = lm;
    this.rules = new Map();
    this.ruleGroups = new Map();
    this.enabledRuleIds = new Set();
    this.performanceMetrics = new Map();
    this.config = {
      enableMetrics: true,
      enableGroups: true,
      maxRules: 1000,
      ...config
    };
  }

  addRule(rule, group = 'general') {
    if (!rule?.id) throw new Error('Invalid rule: must have an ID');
    if (this.rules.size >= this.config.maxRules) throw new Error('Maximum rule limit reached');

    this.rules.set(rule.id, rule);
    this.config.enableGroups && this._updateGroups(rule.id, group);
    rule.enabled && this.enabledRuleIds.add(rule.id);
    this.config.enableMetrics && this._initMetrics(rule.id);
  }

  enable(idOrGroup) { this._toggle(idOrGroup, true); }
  disable(idOrGroup) { this._toggle(idOrGroup, false); }

  _toggle(idOrGroup, enable) {
    const ruleIds = this.rules.has(idOrGroup)
      ? [idOrGroup]
      : this.ruleGroups.get(idOrGroup) || [];
    ruleIds.forEach(id => enable ? this.enabledRuleIds.add(id) : this.enabledRuleIds.delete(id));
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
      avgTime: 0,
      lastRun: null
    });
  }

  updateMetrics(ruleId, success, time) {
    if (!this.config.enableMetrics) return;

    const metrics = this.performanceMetrics.get(ruleId);
    if (!metrics) return;

    metrics.executions++;
    success && metrics.successes++;
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
    return {
      totalRules: this.rules.size,
      enabledRules: this.enabledRuleIds.size,
      ruleTypes: [...new Set(Array.from(this.rules.values()).map(r => r.type))],
      ruleGroups: Array.from(this.ruleGroups.keys()),
      performance: this._aggregateMetrics()
    };
  }

  _aggregateMetrics() {
    const stats = { totalExecutions: 0, totalSuccesses: 0, avgExecutionTime: 0 };
    let count = 0;

    for (const metrics of this.performanceMetrics.values()) {
      stats.totalExecutions += metrics.executions;
      stats.totalSuccesses += metrics.successes;
      stats.avgExecutionTime += metrics.avgTime;
      count++;
    }

    stats.avgExecutionTime = count > 0 ? stats.avgExecutionTime / count : 0;
    return stats;
  }
}