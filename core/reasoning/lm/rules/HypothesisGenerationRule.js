/**
 * @file core/reasoning/lm/rules/HypothesisGenerationRule.js
 * @description Hypothesis generation rule that uses an LM to create new hypotheses based on existing beliefs.
 */

import { createLMRule } from '../LMRuleFactory.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from './RuleHelpers.js';

/**
 * Creates a hypothesis generation rule using the LMRuleFactory.
 * This rule identifies interesting beliefs and uses an LM to generate related hypotheses.
 *
 * @param {object} lm - The Language Model instance.
 * @returns {LMRule} A new LMRule instance for hypothesis generation.
 */
export const createHypothesisGenerationRule = (lm) => {
  return createLMRule({
    id: 'hypothesis-generation',
    lm,
    name: 'Hypothesis Generation Rule',
    description: 'Generates new, related hypotheses based on existing beliefs.',
    priority: 0.6,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { punctuation, priority } = task;
      // Trigger on high-priority, confident beliefs
      return punctuation === Punctuation.JUDGMENT && priority > 0.7 && task.truth.confidence > 0.8;
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `Based on the following belief, what is a plausible and testable hypothesis?

Belief: "${termStr}"

The hypothesis should explore a potential cause, effect, or related phenomenon.
State the hypothesis as a clear, single statement.`;
    },

    process: (lmResponse) => {
      // Clean and validate the response
      const hypothesis = lmResponse.trim().replace(/^Hypothesis: /, '');
      return hypothesis;
    },

    generate: (processedOutput, context) => {
      if (!processedOutput) return [];

      const newTerm = Term.newAtom(processedOutput);
      // Generate a new question to investigate the hypothesis
      const newTask = new Task(
        newTerm,
        Punctuation.QUESTION, // Frame hypothesis as a question to be investigated
        { frequency: 0.5, confidence: 0.5 } // Hypotheses start with medium uncertainty
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.8,
      max_tokens: 200,
    },
  });
};