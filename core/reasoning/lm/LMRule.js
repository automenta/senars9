/**
 * @file core/reasoning/lm/LMRule.js
 * @description LM-specific reasoning rules
 */

import { LMRule as BaseLMRule } from '../Rule.js';
import { Task } from '../../Task.js';

// Import the base classes from the unified system
export { LMRule, NALRule, Rule } from '../Rule.js';  // Use the unified rules as the base for all rules

// This file can now serve as an export-only file since
// the base classes are already defined in the main Rule.js file