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
  constructor(strategyRegistry = null, systemContext = null) {
    this.ruleEngine = new RuleEngine();
    this.strategyRegistry = strategyRegistry;  // Optional StrategyRegistry
    this.systemContext = systemContext;        // Optional SystemContext

    // Default strategy name
    this.defaultStrategy = 'basic_reasoning';
    
    // Configure overlap checking (enabled by default as per requirements)
    this.overlapCheckingEnabled = true;

    // Initialize default rules
    this._initializeRules();

    // Register with strategy registry if provided
    if (this.strategyRegistry) {
      this._registerWithStrategyRegistry();
    }
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
   * Registers the reasoner's basic functionality with the strategy registry
   * @private
   */
  _registerWithStrategyRegistry() {
    // Register the basic reasoning strategy
    this.strategyRegistry.registerStrategy(this.defaultStrategy, {
      execute: (focusSet, memory, context) => this._basicReason(focusSet, memory, context)
    }, {
      description: 'Basic reasoning using rule engine',
      type: 'reasoning',
      group: 'default'
    });
  }

  /**
   * The main reasoning function that can use strategy registry if available.
   *
   * It either uses a registered strategy from StrategyRegistry or falls back
   * to the basic rule engine approach.
   *
   * @param {Task[]} focusSet - Array of tasks to reason about
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The context object for the current cycle
   * @returns {Task[]} Array of newly derived tasks
   */
  reason(focusSet, memory, context) {
    // If StrategyRegistry is available, try to use a registered strategy
    if (this.strategyRegistry && this.systemContext) {
      try {
        // This would select the most appropriate strategy based on context
        return this.strategyRegistry.executeStrategy(this.defaultStrategy, focusSet, memory, context);
      } catch (error) {
        Logger.warn(`Strategy execution failed, falling back to basic reasoning: ${error.message}`);
        // Fall back to basic reasoning
      }
    }

    // Fallback to basic reasoning
    return this._basicReason(focusSet, memory, context);
  }

  /**
   * Performs basic reasoning using the rule engine.
   *
   * This is the original implementation that works without StrategyRegistry.
   *
   * @param {Task[]} focusSet - Array of tasks to reason about
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The context object for the current cycle
   * @returns {Task[]} Array of newly derived tasks
   */
  _basicReason(focusSet, memory, context) {
    const allNewTasks = [];
    
    for (const originalTask of focusSet) {
      const applicableRules = this.ruleEngine.getApplicableRules(originalTask);
      if (!applicableRules) continue;

      for (const rule of applicableRules) {
        try {
          const newTasks = rule.apply(originalTask, memory, context);
          
          if (Array.isArray(newTasks)) {
            // Apply overlap checking if enabled
            if (this.overlapCheckingEnabled) {
              // Filter out tasks that would overlap with the original task that generated them
              const filteredTasks = newTasks.filter(derivedTask => {
                // Check if derived task overlaps with the original task that generated it
                // This prevents cyclic reasoning by avoiding derivations where evidence overlaps
                return !this._hasOverlap(derivedTask, originalTask);
              });
              
              allNewTasks.push(...filteredTasks);
            } else {
              // If overlap checking is disabled, add all tasks
              allNewTasks.push(...newTasks);
            }
          }
        } catch (error) {
          Logger.error(`Error applying rule: ${error.message}`);
        }
      }
    }
    
    return allNewTasks;
  }

  /** 
   * Check if two tasks have overlapping evidence stamps
   * @param {Task} taskA - First task to check
   * @param {Task} taskB - Second task to check
   * @returns {boolean} - True if tasks have overlapping stamps, false otherwise
   */
  _hasOverlap(taskA, taskB) {
    if (!taskA || !taskB || !taskA.stamp || !taskB.stamp) {
      return false;
    }
    return taskA.stamp.overlaps(taskB.stamp);
  }

  /**
   * Select and execute a reasoning strategy based on context
   *
   * This method would analyze the context and select the most appropriate
   * reasoning strategy from the StrategyRegistry.
   *
   * @param {Task[]} focusSet - Array of tasks to reason about
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The context object for the current cycle
   * @returns {Task[]} Array of newly derived tasks
   */
  reasonWithStrategy(focusSet, memory, context) {
    if (!this.strategyRegistry) {
      // If no strategy registry, use basic reasoning
      return this._basicReason(focusSet, memory, context);
    }

    try {
      // Analyze context to select appropriate strategy
      const strategyName = this._selectReasoningStrategy(focusSet, memory, context);

      // Execute the selected strategy
      return this.strategyRegistry.executeStrategy(strategyName, focusSet, memory, context);
    } catch (error) {
      Logger.error(`Strategy selection or execution failed: ${error.message}`);
      // Fall back to basic reasoning
      return this._basicReason(focusSet, memory, context);
    }
  }

  /**
   * Select the most appropriate reasoning strategy based on context
   * @private
   */
  _selectReasoningStrategy(focusSet, memory, context) {
    // For now, return default strategy
    // In a more advanced implementation, this would analyze the context
    // and select the most appropriate strategy based on factors like:
    // - Task complexity
    // - Available computational resources
    // - Task priority
    // - Current system load
    // - Domain of the tasks

    // For now, return the default strategy
    return this.defaultStrategy;
  }

  /**
   * Registers a new inference rule with the reasoner.
   * @param {InferenceRule} rule - The rule to register
   */
  addRule(rule) {
    this.ruleEngine.register(rule);
  }
  
  /**
   * Enable or disable overlap checking
   * @param {boolean} enabled - Whether to enable overlap checking
   */
  setOverlapChecking(enabled) {
    this.overlapCheckingEnabled = enabled;
  }
  
  /**
   * Check if overlap checking is enabled
   * @returns {boolean} - True if overlap checking is enabled
   */
  isOverlapCheckingEnabled() {
    return this.overlapCheckingEnabled;
  }
}