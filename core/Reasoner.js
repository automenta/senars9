import { Logger } from './base/utilities.js';

/**
 * Interface for inference rules.
 */
export class InferenceRule {
  /**
   * Returns the TermType that this rule is designed to be triggered by.
   * This is used by the RuleEngine to index and retrieve rules efficiently.
   * @returns {string} The term type that triggers this rule
   */
  getTriggerTermType() {
    throw new Error('getTriggerTermType() must be implemented by subclass');
  }

  /**
   * Applies the inference rule to a given task.
   * @param {Task} task - The task to apply the rule to
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The context for the current cycle
   * @returns {Task[]} Array of derived tasks, which may be empty
   */
  apply(task, memory, context) {
    throw new Error('apply() must be implemented by subclass');
  }
}

/**
 * The RuleEngine is responsible for storing, indexing, and applying inference rules.
 * 
 * It uses a "winnowing" approach by indexing rules based on the TermType that
 * triggers them. This allows the Reasoner to quickly select only the relevant
 * rules for a given task, avoiding unnecessary checks and improving performance.
 */
export class RuleEngine {
  constructor() {
    // A map from a TermType to an array of rules that are triggered by it.
    // This is the core of the winnowing mechanism.
    this.rules = new Map(); // Map: TermType -> [rule1, rule2, ...]
  }

  /**
   * Registers a new inference rule with the engine.
   * @param {InferenceRule} rule - The rule to be registered
   */
  register(rule) {
    const triggerType = rule.getTriggerTermType();
    if (!this.rules.has(triggerType)) {
      this.rules.set(triggerType, []);
    }
    this.rules.get(triggerType).push(rule);
  }

  /**
   * Gets all rules applicable to a given task (rules triggered by the task's term type).
   * @param {Task} task - The task to find applicable rules for
   * @returns {InferenceRule[]|null} Array of applicable rules, or null if none exist
   */
  getApplicableRules(task) {
    const triggerType = task.term.termType;
    return this.rules.has(triggerType) ? this.rules.get(triggerType) : null;
  }
}

/**
 * A basic reasoner implementation that uses rules to derive new knowledge.
 */
export class Reasoner {
  constructor() {
    this.ruleEngine = new RuleEngine();
    this._initializeRules();
  }

  /**
   * Initializes the default set of inference rules.
   * @private
   */
  _initializeRules() {
    // Register default rules - these will be implemented in separate rule files
    // For now, we'll just initialize the rule engine
  }

  /**
   * The main reasoning function.
   * 
   * It iterates through a "focus set" of tasks. For each task, it queries the
   * RuleEngine for applicable rules and applies them to derive new tasks.
   * 
   * @param {Task[]} focusSet - Array of tasks to reason about
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The context object for the current cycle
   * @returns {Task[]} Array of newly derived tasks
   */
  reason(focusSet, memory, context) {
    const derivedTasks = [];

    for (const task of focusSet) {
      // Find and apply all rules relevant to the current task
      const applicableRules = this.ruleEngine.getApplicableRules(task);
      if (applicableRules) {
        for (const rule of applicableRules) {
          const newTasks = rule.apply(task, memory, context);
          if (Array.isArray(newTasks)) {
            derivedTasks.push(...newTasks);
          }
        }
      }
    }

    return derivedTasks;
  }

  /**
   * Registers a new inference rule with the reasoner.
   * @param {InferenceRule} rule - The rule to register
   */
  addRule(rule) {
    this.ruleEngine.register(rule);
  }
}