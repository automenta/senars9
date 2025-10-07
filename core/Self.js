/**
 * @file: core/Self.js
 * @description: Responsible for system monitoring, performance analysis, and self-optimization.
 * @module Self
 */

import Component from './Component.js';

class Self extends Component {
  constructor() {
    super();
    this.performanceRules = [];
  }

  /**
   * Initializes the Self component.
   * @param {object} config - The configuration for the component.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    // In the future, this could load performance-tuning rules.
  }

  /**
   * Gathers and aggregates statistics from all registered components.
   * @returns {object} An object containing system-wide statistics.
   */
  getSystemStats() {
    if (!this.core) {
      return {};
    }

    const stats = {};
    for (const [name, component] of this.core.componentMap.entries()) {
      if (typeof component.getMetrics === 'function') {
        const metrics = component.getMetrics();
        if (Object.keys(metrics).length > 0) {
          stats[name] = metrics;
        }
      }
    }
    return stats;
  }

  /**
   * Analyzes system performance and suggests or applies optimizations.
   * This is a placeholder for future self-optimization logic.
   */
  async optimize() {
    const stats = this.getSystemStats();

    // Example: Check memory pressure
    if (stats.memory && stats.memory.usage > 0.9) {
      this.emit('system.memory.high_pressure', { usage: stats.memory.usage });
    }

    // Example: Check cycle latency
    if (stats.cycle && stats.cycle.avgLatency > 200) {
      this.emit('system.cycle.high_latency', { latency: stats.cycle.avgLatency });
      // Future action: could adjust cycleIntervalMs
    }

    // Apply performance rules
    for (const rule of this.performanceRules) {
      rule(this.core, stats);
    }
  }

  /**
   * Adds a performance optimization rule.
   * @param {Function} rule - A function that takes the core instance and stats to apply an optimization.
   */
  addPerformanceRule(rule) {
    this.performanceRules.push(rule);
  }
}

export default Self;