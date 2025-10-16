/**
 * @file core/reasoning/lm/rules/ExplanationGenerationRule.js
 * @description Explanation generation rule that uses an LM to create natural language explanations for formal conclusions.
 */

import { createLMRule } from '../LMRuleFactory.js';
import { Term } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';
import { extractTaskFromContext } from './RuleHelpers.js';

/**
 * Checks if a term string represents a complex logical relation.
 * @param {string} termStr - The string representation of the term.
 * @returns {boolean} True if the term contains a complex relation.
 */
const hasComplexRelation = (termStr) => {
  return termStr.includes('-->') || termStr.includes('<->') || termStr.includes('==>');
};

/**
 * Creates an explanation generation rule using the LMRuleFactory.
 * This rule identifies complex logical statements and uses an LM to generate natural language explanations.
 *
 * @param {object} lm - The Language Model instance.
 * @returns {LMRule} A new LMRule instance for explanation generation.
 */
export const createExplanationGenerationRule = (lm) => {
  return createLMRule({
    id: 'explanation-generation',
    lm,
    name: 'Explanation Generation Rule',
    description: 'Generates natural language explanations for formal conclusions.',
    priority: 0.5,

    condition: (context) => {
      const task = extractTaskFromContext(context);
      if (!task) return false;

      const { term, punctuation, priority } = task;
      const termStr = term.toString();
      const isBelief = punctuation === Punctuation.JUDGMENT;

      return isBelief && priority > 0.6 && hasComplexRelation(termStr);
    },

    prompt: (context) => {
      const task = extractTaskFromContext(context);
      const termStr = task.term.toString();
      return `Translate the following formal logic statement into a clear, simple, natural language explanation.

Statement: "${termStr}"

Focus on conveying the core meaning and implication of the statement.`;
    },

    process: (lmResponse) => {
      return lmResponse.trim();
    },

    generate: (processedOutput, context) => {
      if (!processedOutput) return [];

      const originalTask = extractTaskFromContext(context);
      const explanationTerm = Term.newAtom(`explanation_for_(${originalTask.term.toString()})`);

      const newTask = new Task(
        explanationTerm,
        Punctuation.JUDGMENT,
        { frequency: 1.0, confidence: 0.9 },
        null,
        null,
        null,
        null,
        processedOutput // Attach the explanation as metadata
      );

      return [newTask];
    },

    lm_options: {
      temperature: 0.5,
      max_tokens: 300,
    },
  });
};