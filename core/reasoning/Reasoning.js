/**
 * @file core/reasoning/Reasoning.js
 * @description Unified reasoning system that combines NAL and LM reasoning
 */

import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';
import { Rule, LMRule, NALRule } from './Rule.js';
import { TaskPremise, TaskTaskPremise, TaskTermPremise } from './lm/Premise.js';
import { DeductionRule, InductionRule, AbductionRule } from './nal/NALRules.js';
import { GoalDecompositionRule, HypothesisGenerationRule, VariableGroundingRule } from './lm/index.js';
import { Derivation } from './lm/Derivation.js';
import { Winnowing } from './lm/Winnowing.js';

class Reasoning extends Component {
  constructor() {
    super();
    this.rules = new Map(); // All rules
    this.lmRules = new Map(); // LM rules only
    this.nalRules = new Map(); // NAL rules only
    this.enabledRuleIds = new Set();
    this.winnowing = new Winnowing();
    this.derivation = new Derivation();
    this.lm = null; // Language model instance
    this.memory = null; // Memory instance
    this.strategies = new Map();
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.strategies.clear();
    this.reasoningHistory = [];
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;
    
    // Initialize default rules
    this._initializeDefaultRules();
  }

  _initializeDefaultRules() {
    // Add default NAL rules
    this.addRule(new DeductionRule());
    this.addRule(new InductionRule());
    this.addRule(new AbductionRule());
    
    // LM rules will be added dynamically when LM is set
  }

  setLM(lm) {
    this.lm = lm;
    // Add default LM rules when LM becomes available
    if (lm) {
      this.addRule(new GoalDecompositionRule(lm));
      this.addRule(new HypothesisGenerationRule(lm));
      this.addRule(new VariableGroundingRule(lm));
    }
  }

  setMemory(memory) {
    this.memory = memory;
  }

  addRule(rule) {
    this.rules.set(rule.id, rule);
    
    // Categorize rules by type
    if (rule instanceof LMRule) {
      this.lmRules.set(rule.id, rule);
    } else if (rule instanceof NALRule) {
      this.nalRules.set(rule.id, rule);
    }
    
    if (rule.enabled !== false) {
      this.enabledRuleIds.add(rule.id);
      rule.enabled = true;
    }
    
    // If it's an LM rule and we have an LM, set it
    if (rule instanceof LMRule && this.lm) {
      rule.lm = this.lm;
    }
  }

  removeRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      if (rule instanceof LMRule) {
        this.lmRules.delete(ruleId);
      } else if (rule instanceof NALRule) {
        this.nalRules.delete(ruleId);
      }
      this.enabledRuleIds.delete(ruleId);
    }
  }

  enableRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.enabledRuleIds.add(ruleId);
    }
  }

  disableRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.enabledRuleIds.delete(ruleId);
    }
  }

  async reason(focusSet, memory, context = {}) {
    this.memory = memory;
    const allNewTasks = [];
    
    for (const originalTask of focusSet) {
      try {
        // Create a premise from the original task
        const premise = new TaskPremise(originalTask);
        
        // Execute reasoning with the premise
        const results = await this._applyReasoning(premise, context);
        
        if (Array.isArray(results)) {
          allNewTasks.push(...results);
        }
      } catch (error) {
        Logger.error(`Error in reasoning: ${error.message}`);
      }
    }
    
    // Update reasoning history
    this._updateReasoningHistory({
      inputTaskCount: focusSet.length,
      derivedTaskCount: allNewTasks.length,
      timestamp: Date.now()
    });
    
    return allNewTasks;
  }

  async _applyReasoning(premise, context) {
    const results = [];
    
    // Get all enabled rules
    const enabledRules = Array.from(this.enabledRuleIds)
      .map(id => this.rules.get(id))
      .filter(rule => rule && rule.enabled);
    
    // Apply each enabled rule to the premise
    for (const rule of enabledRules) {
      if (!rule.enabled) continue;
      
      try {
        // Create rule-specific context
        const ruleContext = {
          ...context,
          premise,
          tasks: [premise.task],
          memory: this.memory,
          lm: this.lm
        };
        
        if (rule.canApply(ruleContext)) {
          const ruleResult = await rule.apply(ruleContext);
          if (ruleResult) {
            if (Array.isArray(ruleResult)) {
              results.push(...ruleResult);
            } else {
              results.push(ruleResult);
            }
          }
        }
      } catch (error) {
        Logger.error(`Error applying rule ${rule.id}: ${error.message}`);
      }
    }
    
    return results;
  }

  _updateReasoningHistory(entry) {
    this.reasoningHistory.push(entry);
    
    // Keep history size manageable
    if (this.reasoningHistory.length > this.maxHistorySize) {
      this.reasoningHistory = this.reasoningHistory.slice(-this.maxHistorySize);
    }
  }

  getStats() {
    return {
      totalRules: this.rules.size,
      lmRules: this.lmRules.size,
      nalRules: this.nalRules.size,
      enabledRules: this.enabledRuleIds.size,
      reasoningHistorySize: this.reasoningHistory.length,
      hasLM: !!this.lm,
      hasMemory: !!this.memory
    };
  }

  addStrategy(strategy) {
    if (!strategy || !strategy.id || typeof strategy.execute !== 'function') {
      throw new Error('Invalid strategy: must have an id and execute function');
    }
    this.strategies.set(strategy.id, strategy);
  }

  getReasoningHistory(limit = 100) {
    return this.reasoningHistory.slice(-limit);
  }
}

export default Reasoning;