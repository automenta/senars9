/**
 * @file core/reasoning/RuleHelpers.js
 * @description Shared helper functions for reasoning rules.
 */

/**
 * Extracts the task from the reasoning context.
 * @param {object} context - The context object passed to the rule.
 * @returns {Task|null} The task from the premise, or null if not found.
 */
export function extractTaskFromContext(context) {
  if (context.premise?.task) {
    return context.premise.task;
  }
  return null;
}