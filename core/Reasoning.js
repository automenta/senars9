/**
 * @file: core/Reasoning.js
 * @description: Orchestrates the reasoning process by applying inference rules to tasks.
 * @module Reasoning
 */

import Component from './Component.js';

class Reasoning extends Component {
  constructor() {
    super();
    this.strategies = new Map();
  }

  /**
   * Initializes the Reasoning component.
   * @param {object} config - The configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.strategies.clear();
    this.registerDefaultStrategies();
  }

  /**
   * Registers default reasoning strategies.
   */
  registerDefaultStrategies() {
    // A simple default strategy that uses the rules engine directly.
    this.addStrategy({
      id: 'default',
      name: 'Default Forward Chaining',
      description: 'Applies all applicable rules to a set of tasks.',
      execute: (tasks, context) => {
        if (!this.core || !this.core.rules) {
          throw new Error('Rules component not available on core.');
        }
        return this.core.rules.executeRules(tasks, context);
      },
    });
  }

  /**
   * Adds a reasoning strategy.
   * @param {object} strategy - The strategy object to add.
   */
  addStrategy(strategy) {
    if (!strategy || !strategy.id) {
      throw new Error('Strategy must have an ID.');
    }
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Removes a reasoning strategy.
   * @param {string} strategyId - The ID of the strategy to remove.
   */
  removeStrategy(strategyId) {
    this.strategies.delete(strategyId);
  }

  /**
   * Executes a reasoning cycle using a specified strategy.
   * @param {Array<object>} tasks - The set of tasks to reason about.
   * @param {object} context - The reasoning context.
   * @param {string} strategyId - The ID of the strategy to use.
   * @returns {Promise<Array<object>>} A list of derived tasks.
   */
  async reason(tasks, context = {}, strategyId = 'default') {
    if (!this.strategies.has(strategyId)) {
      throw new Error(`Reasoning strategy "${strategyId}" not found.`);
    }
    const strategy = this.strategies.get(strategyId);
    const derivedTasks = await strategy.execute(tasks, context);
    return derivedTasks;
  }

  /**
   * Retrieves reasoning-related performance metrics.
   * @returns {object}
   */
  getMetrics() {
    return {
      strategyCount: this.strategies.size,
    };
  }
}

export default Reasoning;