/**
 * Rule factory for consistent rule instantiation
 */

import { NALRule } from './NALRule.js';
import { DeductionRule, InductionRule, AbductionRule } from './nal/NALRules.js';
import { ModusPonensRule } from './nal/ModusPonensRule.js';
import { DeductiveSyllogismRule } from './nal/SyllogisticRules.js';
import { Analogy as AnalogyRule } from './nal/AnalogyRule.js';
import { createGoalDecompositionRule } from './lm/rules/GoalDecompositionRule.js';
import { createHypothesisGenerationRule } from './lm/rules/HypothesisGenerationRule.js';
import { createVariableGroundingRule } from './lm/rules/VariableGroundingRule.js';

const NAL_RULES = {
  deduction: DeductionRule,
  induction: InductionRule,
  abduction: AbductionRule,
  modusPonens: ModusPonensRule,
  syllogism: DeductiveSyllogismRule,
  analogy: AnalogyRule
};

const LM_RULES = {
  goalDecomposition: createGoalDecompositionRule,
  hypothesisGeneration: createHypothesisGenerationRule,
  variableGrounding: createVariableGroundingRule
};

export class RuleFactory {
  static createNALRule(type, options = {}) {
    const RuleClass = NAL_RULES[type];
    if (!RuleClass) throw new Error(`Unknown NAL rule type: ${type}`);
    return new RuleClass(options);
  }

  static createLMRule(type, dependencies = {}, options = {}) {
    const RuleClass = LM_RULES[type];
    if (!RuleClass) throw new Error(`Unknown LM rule type: ${type}`);
    return RuleClass(dependencies, options);
  }

  static getAvailableNALRules() {
    return Object.keys(NAL_RULES);
  }

  static getAvailableLMRules() {
    return Object.keys(LM_RULES);
  }

  static createRule(type, config = {}) {
    const { ruleType = 'nal', dependencies = {}, options = {} } = config;

    if (ruleType === 'nal') {
      return this.createNALRule(type, options);
    } else if (ruleType === 'lm') {
      return this.createLMRule(type, dependencies, options);
    }

    throw new Error(`Unknown rule type: ${ruleType}`);
  }
}