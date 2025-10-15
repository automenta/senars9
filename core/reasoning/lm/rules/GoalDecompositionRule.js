/**
 * @file core/reasoning/lm/rules/GoalDecompositionRule.js
 * @description Goal decomposition rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';
import { Term, TermType } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';

export class GoalDecompositionRule extends LMRule {
  constructor(lm) {
    super('goal-decomposition', lm, {
      name: 'Goal Decomposition Rule',
      description: 'Breaks down high-level goals into concrete sub-goals',
      priority: 0.8
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
    
    const isGoal = task.punctuation === '!' || task.punctuation === Punctuation.GOAL;
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    return isGoal && priority > 0.05;
  }

  generatePrompt(context) {
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
      // Fallback - if context is the task itself
      task = context;
    }
    
    if (!task) {
      throw new Error('No task provided to generate prompt for GoalDecompositionRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Decompose this goal into 3-5 concrete, actionable sub-goals that would help achieve it: "${termStr}". Provide them as a numbered list.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM response to extract sub-goals
    const lines = lmResponse.split('\n');
    const subGoals = [];

    for (const line of lines) {
      // Look for numbered items or bullet points
      const match = line.match(/\d+\.\s*(.+)/) || line.match(/[•*-]\s*(.+)/);
      if (match) {
        // Clean up the sub-goal text
        let goal = match[1].trim();
        // Remove any trailing punctuation
        goal = goal.replace(/[.:;!]$/, '');
        if (goal && goal.length > 2) { // Ensure it's meaningful
          subGoals.push(goal);
        }
      }
    }

    // If no structured format found, try simple extraction
    if (subGoals.length === 0) {
      // Extract any imperative sentences (starting with verbs)
      const sentences = lmResponse.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        // Look for potential action items
        if (trimmed && trimmed.length > 5 && (trimmed.toLowerCase().startsWith('create') || 
            trimmed.toLowerCase().startsWith('establish') || 
            trimmed.toLowerCase().startsWith('implement') || 
            trimmed.toLowerCase().startsWith('ensure') || 
            trimmed.toLowerCase().startsWith('improve') ||
            trimmed.toLowerCase().startsWith('develop') ||
            trimmed.toLowerCase().startsWith('increase') ||
            trimmed.toLowerCase().startsWith('reduce'))) {
          subGoals.push(trimmed);
        }
      }
    }

    return subGoals;
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    // Get the original premise for creating links
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
    
    if (Array.isArray(processedOutput) && processedOutput.length > 0) {
      for (const subGoal of processedOutput) {
        if (subGoal && subGoal.trim()) {
          const trimmedGoal = subGoal.trim();
          
          const newTerm = Term.newAtom(trimmedGoal);

          const newTask = new Task(
            newTerm,
            '!',
            { frequency: 0.8, confidence: 0.7 },
            Date.now(),
            Date.now()
          );
          
          newTasks.push(newTask);

          // Also create a belief linking the sub-goal to the original goal
          if (originalTask && originalTask.term) {
            const linkTerm = Term.createCompound(TermType.IMPLICATION, [newTerm, originalTask.term]);
            
            const beliefTask = new Task(
              linkTerm,
              '.',
              { frequency: 0.9, confidence: 0.8 },
              Date.now(),
              Date.now()
            );
            
            newTasks.push(beliefTask);
          }
        }
      }
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
      console.error(`Error in GoalDecompositionRule:`, error);
      return [];
    }
  }
}
