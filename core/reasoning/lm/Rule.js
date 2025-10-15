/**
 * @file core/reasoning/lm/Rule.js
 * @description LM-specific reasoning rules
 */

import { LMRule as BaseLMRule } from '../Rule.js';
import { Task } from '../../Task.js';

// LMRule is now imported from the unified base, so we'll extend it if needed for LM-specific functionality
export { LMRule } from '../Rule.js';  // Use the unified LMRule as the base for all LM rules

/**
 * Base class for LM integration rules that involve language model processing
 */
export class LMRule extends Rule {
  constructor(id, lm, options = {}) {
    super(id, options);
    this.lm = lm; // Language model instance
    this.lmPromptTemplate = options.lmPromptTemplate || null;
  }

  /**
   * Generates a prompt for the language model based on the premise
   * @param {Premise} premise - The premise to generate a prompt for
   * @returns {string} The generated prompt
   */
  generatePrompt(premise) {
    if (this.lmPromptTemplate) {
      return this.lmPromptTemplate(premise);
    }
    throw new Error('No LM prompt template provided');
  }

  /**
   * Processes the output from the language model
   * @param {string} lmOutput - The raw output from the language model
   * @param {Premise} premise - The original premise
   * @returns {any} Processed output
   */
  processLMOutput(lmOutput, premise) {
    return lmOutput;
  }

  /**
   * Generates new tasks from processed LM output
   * @param {any} processedOutput - The processed output from LM
   * @param {Premise} premise - The original premise
   * @returns {Array<Task>} Array of new tasks
   */
  generateTasks(processedOutput, premise) {
    return [];
  }

  /**
   * Executes the LM-based processing pipeline
   * @param {Premise} premise - The premise to process
   * @returns {Promise<Array<Task>>} Array of new tasks generated
   */
  async executeLMProcessing(premise) {
    if (!this.lm) {
      throw new Error(`LM not available for rule ${this.id}`);
    }

    try {
      const prompt = this.generatePrompt(premise);
      const lmResponse = await this.lm.process(prompt);
      const processedOutput = this.processLMOutput(lmResponse, premise);
      return this.generateTasks(processedOutput, premise) || [];
    } catch (error) {
      console.error(`Error in LM processing for rule ${this.id}:`, error);
      return [];
    }
  }
}