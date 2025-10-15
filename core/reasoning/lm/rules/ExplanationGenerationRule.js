/**
 * @file core/reasoning/lm/rules/ExplanationGenerationRule.js
 * @description Explanation generation rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class ExplanationGenerationRule extends LMRule {
  constructor(lm) {
    super('explanation-generation', lm, {
      name: 'Explanation Generation Rule',
      description: 'Generates natural language explanations for formal conclusions',
      priority: 0.5
    });
  }

  canApply(context) {
    // Handle both old and new context formats
    let task;
    if (context.premise && context.premise.task) {
      // New context format from reasoner
      task = context.premise.task;
    } else if (context.premise1) {
      // Old context format used by test framework
      task = context.premise1;
    } else if (Array.isArray(context.tasks) && context.tasks.length > 0) {
      // Format used potentially by test framework
      task = context.tasks[0];
    } else {
      return false;
    }
    
    if (!task) return false;
    
    const termStr = task.term ? task.term.toString() : '';
    const isBelief = task.punctuation === '.';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    // Apply to beliefs that represent conclusions or complex relationships that might benefit from explanation
    const hasComplexRelation = /==>|<=>|=/g.test(termStr);
    
    return isBelief && priority > 0.1 && hasComplexRelation;
  }

  generatePrompt(context) {
    // Handle both old and new context formats
    let task;
    if (context.premise && context.premise.task) {
      task = context.premise.task;
    } else if (context.premise1) {
      task = context.premise1;
    } else if (Array.isArray(context.tasks) && context.tasks.length > 0) {
      task = context.tasks[0];
    } else {
      task = context;
    }
    
    if (!task) {
      throw new Error('No task provided to generate prompt for ExplanationGenerationRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Provide a clear, natural language explanation for this logical statement: "${termStr}". Explain what it means in simple terms and why this relationship might be true or important.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM's explanation
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    if (processedOutput && processedOutput.trim()) {
      // Create a natural language explanation as a belief
      newTasks.push({
        term: `explanation_of_${(context.premise?.task?.term || 'unknown').toString().replace(/[^\w]/g, '_')}`,
        punctuation: '.',
        truth: { frequency: 0.95, confidence: 0.9 },
        content: processedOutput
      });
      
      // Create a meta-belief linking the formal statement to its explanation
      newTasks.push({
        term: `(formal_statement_explained --> "${processedOutput}").`,
        punctuation: '.',
        truth: { frequency: 0.95, confidence: 0.9 }
      });
    }
    
    return newTasks;
  }

  async apply(context) {
    try {
      if (!this.canApply(context)) return [];
      const lmResponse = await this.executeLMProcessing(context);
      const processedOutput = this.processLMOutput(lmResponse, context);
      const newTasks = this.generateTasks(processedOutput, context);
      return newTasks || [];
    } catch (error) {
      console.error(`Error in ExplanationGenerationRule:`, error);
      return [];
    }
  }
}