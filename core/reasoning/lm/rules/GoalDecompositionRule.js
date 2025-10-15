/**
 * @file core/reasoning/lm/rules/GoalDecompositionRule.js
 * @description Goal decomposition rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';
import { Term, TermType } from '../../../Term.js';
import { Task } from '../../../Task.js';

export class GoalDecompositionRule extends LMRule {
  constructor(lm) {
    super('goal-decomposition', lm, {
      name: 'Goal Decomposition Rule',
      description: 'Breaks down high-level goals into concrete sub-goals',
      priority: 0.8
    });
  }

  canApply({ premise1 }) {
    // Check if the premise contains a goal task with sufficient priority
    if (!premise1) return false;
    
    const task = premise1;
    const isGoal = task.punctuation === '!';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    return isGoal && priority > 0.05;
  }

  generatePrompt({ premise1 }) {
    const task = premise1;
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Decompose this goal into 3-5 concrete, actionable sub-goals that would help achieve it: "${termStr}". Provide them as a numbered list.`;
  }

  processLMOutput(lmResponse, { premise1 }) {
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

  generateTasks(processedOutput, { premise1 }) {
    const newTasks = [];
    
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
          if (premise1.term) {
            const linkTerm = Term.createCompound(TermType.IMPLICATION, [newTerm, premise1.term]);
            
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
