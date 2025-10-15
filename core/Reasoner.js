import { Logger } from './base/utilities.js';

export class Reasoner {
  constructor(strategyRegistry = null, systemContext = null) {
    this.strategyRegistry = strategyRegistry;
    this.systemContext = systemContext;
    this.defaultStrategy = 'basic_reasoning';
    this.overlapCheckingEnabled = true;
    this._initializeRules();
    this.strategyRegistry && this._registerWithStrategyRegistry();
  }

  _initializeRules() {}

  _registerWithStrategyRegistry() {
    if (!this.strategyRegistry) return;
    
    this.strategyRegistry.registerStrategy(this.defaultStrategy, {
      execute: (focusSet, memory, context) => this._basicReason(focusSet, memory, context)
    }, {
      description: 'Basic reasoning using NARS rule engine',
      type: 'reasoning',
      group: 'default'
    });
  }

  reason(focusSet, memory, context) {
    if (this.strategyRegistry && this.systemContext) {
      try {
        return this.strategyRegistry.executeStrategy(this.defaultStrategy, focusSet, memory, context);
      } catch (error) {
        Logger.warn(`Strategy execution failed, falling back to basic reasoning: ${error.message}`);
      }
    }
    return this._basicReason(focusSet, memory, context);
  }

  _basicReason(focusSet, memory, context) {
    // The actual reasoning will be handled by the core/reasoning/Reasoning.js system
    // This is maintained for compatibility with the existing interface
    const allNewTasks = [];
    
    // For now, this is a simplified version - in a real implementation,
    // this would interface with the unified reasoning system in core/reasoning/Reasoning.js
    for (const originalTask of focusSet) {
      // Placeholder - actual rule application would happen in the main reasoning system
    }
    
    return allNewTasks;
  }

  _hasOverlap(taskA, taskB) { return taskA?.stamp?.overlaps(taskB?.stamp) || false; }

  reasonWithStrategy(focusSet, memory, context) {
    if (!this.strategyRegistry) return this._basicReason(focusSet, memory, context);
    try {
      const strategyName = this._selectReasoningStrategy(focusSet, memory, context);
      return this.strategyRegistry.executeStrategy(strategyName, focusSet, memory, context);
    } catch (error) {
      Logger.error(`Strategy selection or execution failed: ${error.message}`);
      return this._basicReason(focusSet, memory, context);
    }
  }

  _selectReasoningStrategy(focusSet, memory, context) { return this.defaultStrategy; }

  addRule(rule) { 
    // In a real implementation, this would add to the main reasoning system
  }
  
  setOverlapChecking(enabled) { this.overlapCheckingEnabled = enabled; }
  isOverlapCheckingEnabled() { return this.overlapCheckingEnabled; }
  
  // Set LM (for compatibility)
  setLM(lm) {
    // In a real implementation, this would be handled by the main reasoning system
  }
}
