/**
 * @file core/reasoning/lm/rules/BeliefRevisionRule.js
 * @description Belief revision rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class BeliefRevisionRule extends LMRule {
  constructor(lm) {
    super('belief-revision', lm, {
      name: 'Belief Revision Rule',
      description: 'Helps resolve contradictions by suggesting belief revisions',
      priority: 0.9
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
    
    // Check if task represents or contains contradictions/contlicts
    const termStr = task.term ? task.term.toString() : '';
    const isBelief = task.punctuation === '.' || task.punctuation === '?';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    // Apply if this is a belief with potential contradiction/conflict indicators
    const hasConflictTerms = /contradict|conflict|inconsist|oppos|vs|versus|vs\./i.test(termStr);
    
    return (isBelief && priority > 0.1) && hasConflictTerms;
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
      throw new Error('No task provided to generate prompt for BeliefRevisionRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `This belief contains a contradiction or conflict: "${termStr}". How might we resolve this contradiction? Provide specific conditional statements or nuanced explanations that could reconcile the apparent conflict. If no resolution is possible, suggest which belief should be revised and why.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM response to extract revision suggestions
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    // Get the original premise for context
    let originalTask;
    if (context.premise && context.premise.task) {
      originalTask = context.premise.task;
    } else if (context.premise1) {
      originalTask = context.premise1;
    } else if (Array.isArray(context.tasks) && context.tasks.length > 0) {
      originalTask = context.tasks[0];
    } else {
      originalTask = context;
    }
    
    if (processedOutput && processedOutput.trim()) {
      // Create a belief with the resolution
      const resolutionTerm = `resolution_of_${(originalTask.term || 'unknown').toString().replace(/[^\w]/g, '_')}`;
      newTasks.push({
        term: `(${resolutionTerm} --> "${processedOutput}").`,
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 }
      });
      
      // Create a revised version of the conflicted belief based on LM suggestion
      newTasks.push({
        term: processedOutput,
        punctuation: '.',
        truth: { frequency: 0.7, confidence: 0.6 }
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
      console.error(`Error in BeliefRevisionRule:`, error);
      return [];
    }
  }
}