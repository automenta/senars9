/**
 * @file core/reasoning/lm/LMRuleFactory.js
 * @description Factory function for creating LMRule instances.
 */

import { LMRule } from '../Rule.js';

/**
 * Creates and configures an LMRule instance from a configuration object.
 * This factory simplifies the creation of LM-based rules by providing a declarative API.
 *
 * @param {object} config - The rule configuration object.
 * @param {string} config.id - The unique identifier for the rule.
 * @param {object} config.lm - The Language Model instance.
 * @param {string} [config.name] - The human-readable name of the rule.
 * @param {string} [config.description] - A brief description of the rule's purpose.
 * @param {number} [config.priority] - The priority of the rule in the reasoning process.
 * @param {function} [config.condition] - A function that determines if the rule can be applied to a given context.
 * @param {function} config.prompt - A function that generates the prompt for the Language Model.
 * @param {function} [config.process] - A function that processes the raw output from the Language Model.
 * @param {function} [config.generate] - A function that generates new tasks from the processed output.
 * @param {object} [config.lm_options] - The options to pass to the Language Model.
 * @returns {LMRule} A new LMRule instance.
 */
export function createLMRule(config) {
  const { id, lm, ...rest } = config;
  if (!id || !lm) {
    throw new Error('LMRuleFactory: `id` and `lm` are required to create an LMRule.');
  }
  return new LMRule(id, lm, rest);
}