/**
 * @file core/reasoning/lm/rules/VariableGroundingRule.js
 * @description Variable grounding rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class VariableGroundingRule extends LMRule {
  constructor(lm) {
    super('variable-grounding', lm, {
      name: 'Variable Grounding Rule',
      description: 'Suggests possible values for variables in tasks',
      priority: 0.7
    });
  }

  canApply(premise) {
    // Check if the task contains a variable (indicated by ?X pattern)
    if (premise.type !== 'Task' || !premise.task) return false;
    
    const task = premise.task;
    return task.term && (typeof task.term === 'string' ? task.term : task.term.toString()).includes('?');
  }

  generatePrompt(premise) {
    return `For the task "${premise.task.term}", what are 3 plausible values for the variable? Provide them as a list.`;
  }

  processLMOutput(lmResponse, premise) {
    const lines = lmResponse.split('\n');
    const candidates = [];

    for (const line of lines) {
      const match = line.match(/\d+\.\s*(.+)/) || line.match(/[•*-]\s*(.+)/);
      if (match) {
        candidates.push(match[1].trim());
      }
    }

    // If no structured format found, try simple extraction
    if (candidates.length === 0) {
      // Try simple sentence splitting
      const sentences = lmResponse.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed && trimmed.length > 3) {
          candidates.push(trimmed);
        }
      }
    }

    return candidates;
  }

  generateTasks(processedOutput, premise) {
    const newTasks = [];

    if (Array.isArray(processedOutput)) {
      for (const candidate of processedOutput) {
        if (candidate.trim()) {
          // Replace the variable with the candidate value
          const originalTerm = typeof premise.task.term === 'string' 
            ? premise.task.term 
            : premise.task.term.toString();
          
          const groundedTerm = originalTerm.replace(/\?\w+/, 
            candidate.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''));
          newTasks.push({
            term: groundedTerm,
            punctuation: premise.task.punctuation,
            truth: { frequency: 0.5, confidence: 0.4 }  // Lower confidence for generated values
          });
        }
      }
    }

    return newTasks;
  }

  async apply(premise, context) {
    try {
      const newTasks = await this.executeLMProcessing(premise);
      return newTasks || [];
    } catch (error) {
      console.error(`Error in VariableGroundingRule:`, error);
      return [];
    }
  }
}