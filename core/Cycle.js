/**
 * @file: core/Cycle.js
 * @description: Manages the main cognitive loop, orchestrating the phases of perception, reasoning, and action with adaptive timing.
 * @module Cycle
 */

import Component from './Component.js';

class Cycle extends Component {
  constructor() {
    super();
    this.isRunning = false;
    this.cycleTimer = null;
    this.cycleIntervalMs = 100; // Default cycle interval
  }

  /**
   * Initializes the Cycle component.
   * @param {object} config - Configuration for the cycle, including 'cycleIntervalMs'.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.cycleIntervalMs = config.cycleIntervalMs || this.cycleIntervalMs;
  }

  /**
   * Starts the cognitive cycle.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.cycleTimer = setInterval(() => this._runCycle(), this.cycleIntervalMs);
    await super.start();
  }

  /**
   * Stops the cognitive cycle.
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
    await super.stop();
  }

  /**
   * The main cognitive cycle loop.
   * This method orchestrates the different phases of the system's operation.
   * @private
   */
  async _runCycle() {
    if (!this.core) return;

    // 1. Perception: Convert external input to tasks (handled externally, tasks are added to memory)

    // 2. Prioritization: Calculate task priorities (handled by a future PriorityManager or within Memory)

    // 3. Focus Selection: Select tasks for the current cycle
    const focusSet = await this._selectFocusSet();

    // 4. Reasoning: Apply inference rules to the focus set
    if (this.core.reasoner) {
      const derivedTasks = await this.core.reasoner.reason(focusSet);
      if (derivedTasks.length > 0 && this.core.memory) {
        // await this.core.memory.addTasks(derivedTasks); // Assumes an addTasks method
      }
    }

    // 5. Meta-Cognition: Detect contradictions and conflicts (future implementation)

    // 6. Neural Enrichment: Use LMs for insights (future implementation)

    // 7. Planning: Create action sequences for goals (future implementation)

    // 8. Action Execution: Execute plans (future implementation)

    // 9. Learning: Consolidate new knowledge into memory
    if (this.core.memory) {
      await this.core.memory.consolidateKnowledge();
    }

    // Adaptive Timing: Adjust cycle interval based on system load (future implementation)
  }

  /**
   * Selects a set of tasks to focus on for the current cycle.
   * @returns {Promise<Array<object>>} A list of tasks for the focus set.
   * @private
   */
  async _selectFocusSet() {
    if (!this.core || !this.core.memory) {
      return [];
    }
    // Simple strategy: get a few of the most recently added tasks
    const allTasks = await this.core.memory.queryTasks({}); // A simple query for now
    allTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const focusSetSize = this.core.config.get('core.focusSetSize', 10);
    return allTasks.slice(0, focusSetSize);
  }
}

export default Cycle;