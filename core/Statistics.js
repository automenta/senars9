import { Logger } from './base/utilities.js';

export class Statistics {
  constructor(nar) {
    this.nar = nar;
  }

  getStats() {
    const memoryState = this.getMemoryState();
    const reasonerStats = this.nar.reasoner.getStats();

    return {
      ...this.nar.stats,
      taskCount: memoryState.totalTasks,
      conceptCount: memoryState.concepts,
      uptime: this.nar.stats.birthdate ? this.nar.clock.getTime() - this.nar.stats.birthdate : 0,
      memoryState,
      reasonerStats,
      reasoningMetrics: this._getReasoningMetrics()
    };
  }

  _getReasoningMetrics() {
    const enabledRules = this.nar.reasoner.getEnabledRules();
    const ruleTypeCounts = {};

    enabledRules.forEach(rule => {
      if (rule.type) {
        ruleTypeCounts[rule.type] = (ruleTypeCounts[rule.type] || 0) + 1;
      }
    });

    return {
      enabledRulesCount: enabledRules.length,
      ruleTypeDistribution: ruleTypeCounts,
      averageRulesPerCycle: this.nar.stats.cycles > 0
        ? (this.nar.stats.derivedTasks / this.nar.stats.cycles).toFixed(2)
        : 0
    };
  }

  getDetailedReasoningReport() {
    const stats = this.getStats();
    const enabledRules = this.nar.reasoner.getEnabledRules();

    return {
      ...stats,
      enabledRules: enabledRules.map(rule => ({
        id: rule.id,
        name: rule.name || rule.id,
        type: rule.type,
        priority: rule.priority,
        description: rule.description
      })),
      rulePerformance: this._getRulePerformanceReport()
    };
  }

  _getRulePerformanceReport() {
    const performance = this.nar.reasoner.getStats().performance;
    const enabledRules = this.nar.reasoner.getEnabledRules();

    return {
      ...performance,
      ruleDetails: enabledRules.map(rule => {
        const metrics = this.nar.reasoner.performanceMetrics.get(rule.id);
        return metrics ? {
          id: rule.id,
          executions: metrics.executions,
          successes: metrics.successes,
          failures: metrics.failures,
          successRate: metrics.executions > 0
            ? ((metrics.successes / metrics.executions) * 100).toFixed(1) + '%'
            : '0%',
          avgTime: Math.round(metrics.avgTime * 100) / 100 + 'ms',
          lastError: metrics.lastError
        } : null;
      }).filter(Boolean)
    };
  }

  getMemoryState() {
    return {
        totalTasks: this.nar.getTasks().length,
        beliefs: this.nar.getBeliefs().length,
        goals: this.nar.getGoals().length,
        questions: this.nar.getQuestions().length,
        concepts: this.nar.memory.conceptStorage.size,
        focusTasks: this.nar.focus.getFocusItems().length,
        longTermTasks: this.nar.memory.getAllTasks().size
      };
    }
}