/**
 * @file core/reasoning/index.js
 * @description Main entry point for the unified reasoning system
 */

// Export unified reasoning classes
export { Rule, LMRule, NALRule } from './Rule.js';

// Export premise classes
export { 
  Premise, 
  TaskPremise, 
  TaskTaskPremise, 
  TaskTermPremise 
} from './lm/Premise.js';

// Export LM-specific rules
export { 
  GoalDecompositionRule, 
  HypothesisGenerationRule, 
  VariableGroundingRule 
} from './lm/index.js';

// Export NAL-specific rules
export { 
  DeductionRule, 
  InductionRule, 
  AbductionRule 
} from './nal/index.js';