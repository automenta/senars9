/**
 * @file core/reasoning/lm/rules/HypothesisGenerationRule.js
 * @description Hypothesis generation rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class HypothesisGenerationRule extends LMRule {
  constructor(lm) {
    super('hypothesis-generation', lm, {
      name: 'Hypothesis Generation Rule',
      description: 'Generates related hypotheses based on beliefs',
      priority: 0.6
    });
  }

  canApply(premise) {
    // Look for beliefs that might benefit from additional hypotheses
    if (premise.type !== 'Task' || !premise.task) return false;
    
    const task = premise.task;
    const isBelief = task.punctuation === '.';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    return isBelief && priority > 0.1;
  }

  generatePrompt(premise) {
    return `Based on the belief "${premise.task.term}", what is a related hypothesis that could either support or challenge this belief? Express it as a causal relationship if possible.`;
  }

  processLMOutput(lmResponse, premise) {
    // Process the LM's hypothesis
    return lmResponse.trim();
  }

  generateTasks(processedOutput, premise) {
    if (!processedOutput || !processedOutput.trim()) return [];
    
    // Convert the hypothesis to Narsese format
    let narseseHypothesis = processedOutput.trim();
    
    // If it's not already in Narsese format, try to convert it
    if (!narseseHypothesis.includes('==>') && !narseseHypothesis.includes('=') && !narseseHypothesis.includes('<=>')) {
      // Simple conversion - assume it's a potential implication
      narseseHypothesis = `(${premise.task.term.replace(/[.?]/g, '')} ==> ${narseseHypothesis.replace(/[.?]/g, '')}).`;
    }
    
    return [{
      term: narseseHypothesis,
      punctuation: '.',
      truth: { frequency: 0.6, confidence: 0.5 }  // Lower confidence for generated hypotheses
    }];
  }

  async apply(premise, context) {
    try {
      const newTasks = await this.executeLMProcessing(premise);
      return newTasks || [];
    } catch (error) {
      console.error(`Error in HypothesisGenerationRule:`, error);
      return [];
    }
  }
}