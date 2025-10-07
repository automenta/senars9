/**
 * @file: core/Cycle.js
 * @description: Manages the core cognitive cycle, orchestrating the phases of reasoning and system maintenance.
 * @module Cycle
 */

import Component from './Component.js';

class Cycle extends Component {
  constructor() {
    super();
    this.cycleTimer = null;
    this.isCycling = false;
    this.cycleCount = 0;
  }

  /**
   * Initializes the Cycle component.
   * @param {object} config - The configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.config.intervalMs = this.config.intervalMs || 1000; // Default to 1 second
  }

  /**
   * Starts the cognitive cycle.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isCycling) return;
    this.isCycling = true;
    this.cycleTimer = setInterval(() => this.run(), this.config.intervalMs);
    await super.start();
    this.emit('cycle.started');
  }

  /**
   * Stops the cognitive cycle.
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isCycling) return;
    clearInterval(this.cycleTimer);
    this.isCycling = false;
    this.cycleTimer = null;
    await super.stop();
    this.emit('cycle.stopped');
  }

  /**
   * Runs a single cognitive cycle.
   */
  async run() {
    this.cycleCount++;
    this.emit('cycle.before', { count: this.cycleCount });

    try {
      // 1. Select focus set from memory (placeholder)
      const focusSet = await this.selectFocusSet();

      // 2. Perform reasoning on the focus set
      if (focusSet.length > 0) {
        await this.core.reasoning.reason(focusSet);
      }

      // 3. Perform self-monitoring and maintenance (placeholder)
      await this.performMaintenance();
    } catch (error) {
      this.emit('cycle.error', { error });
      console.error('Error during cognitive cycle:', error);
    }

    this.emit('cycle.after', { count: this.cycleCount });
  }

  /**
   * Selects the set of tasks to focus on for the current cycle.
   * @returns {Promise<Array<object>>}
   * @private
   */
  async selectFocusSet() {
    // Placeholder: In a real implementation, this would involve complex
    // prioritization logic based on task priority, recency, relevance, etc.
    if (!this.core || !this.core.memory) {
      throw new Error('Memory component not available on core.');
    }
    // For now, just grab a few recent tasks.
    const allTasks = await this.core.memory.queryTasks({});
    return allTasks.slice(0, this.config.focusSetSize || 5);
  }

  /**
   * Performs system maintenance tasks.
   * @private
   */
  async performMaintenance() {
    // Placeholder for self-optimization, memory consolidation, etc.
  }

  /**
   * Retrieves cycle-related performance metrics.
   * @returns {object}
   */
  getMetrics() {
    return {
      isCycling: this.isCycling,
      cycleCount: this.cycleCount,
      intervalMs: this.config.intervalMs,
    };
  }
}

export default Cycle;