/**
 * @file core/reasoning/lm/rules/RuleHelpers.js
 * @description Shared helper functions for creating and processing LM-based rules.
 */

import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';

/**
 * Extracts the primary task from a rule context.
 * @param {object} context - The rule context.
 * @returns {Task|null} The extracted task or null if not found.
 */
export function extractTaskFromContext(context) {
  if (context.premise?.task) return context.premise.task;
  if (context.premise1) return context.premise1;
  if (Array.isArray(context.tasks) && context.tasks.length > 0) return context.tasks[0];
  if (context.term && context.punctuation) return context;
  return null;
}

/**
 * Parses a string of sub-goals from an LM response into an array.
 * @param {string} lmResponse - The raw response from the LM.
 * @returns {string[]} An array of sub-goal strings.
 */
export function parseSubGoals(lmResponse) {
  return lmResponse
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove common list prefixes like "1.", "1)", "-", "*"
      return line.replace(/^\s*\d+[\.\)]\s*|^\s*[-*]\s*/, '').trim();
    });
}

/**
 * Cleans a sub-goal string by removing extra punctuation and quotes.
 * @param {string} goal - The sub-goal string.
 * @returns {string} The cleaned sub-goal.
 */
export function cleanSubGoal(goal) {
  if (!goal) return '';
  // Remove wrapping quotes
  goal = goal.replace(/^["']|["']$/g, '');
  // Remove trailing punctuation
  goal = goal.replace(/[.,;!?]+$/, '');
  return goal.trim();
}

/**
 * Validates a sub-goal based on length and content constraints.
 * @param {string} goal - The sub-goal to validate.
 * @param {number} minLength - The minimum allowed length.
 * @param {number} maxLength - The maximum allowed length.
 * @returns {boolean} True if the sub-goal is valid, false otherwise.
 */
export function isValidSubGoal(goal, minLength, maxLength) {
  if (!goal || goal.length < minLength || goal.length > maxLength) {
    return false;
  }
  // Avoid common LM refusal patterns
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes('sorry') || lowerGoal.includes('cannot') || lowerGoal.includes('unable')) {
    return false;
  }
  return true;
}

/**
 * Creates a new sub-goal task based on an original task.
 * @param {string} subGoal - The sub-goal content.
 * @param {Task} originalTask - The original goal task.
 * @returns {Task} The new sub-goal task.
 */
import { TruthValue } from '../../../Task.js';

export function createSubGoalTask(subGoal, originalTask) {
  const originalTruth = originalTask.truth || new TruthValue(1.0, 0.9);
  const inheritedTruth = new TruthValue(
    originalTruth.frequency,
    originalTruth.confidence * 0.9, // Sub-goals are slightly less confident
  );

  const newTerm = Term.newAtom(subGoal);
  return new Task(
    newTerm,
    Punctuation.GOAL,
    inheritedTruth,
    null, // Let the system assign a stamp
    null,
    0.8 // Default priority for sub-goals
  );
}