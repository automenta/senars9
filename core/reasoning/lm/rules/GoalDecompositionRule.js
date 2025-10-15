/**
 * @file core/reasoning/lm/rules/GoalDecompositionRule.js
 * @description Goal decomposition rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class GoalDecompositionRule extends LMRule {
  constructor(lm) {
    super('goal-decomposition', lm, {
      name: 'Goal Decomposition Rule',
      description: 'Breaks down high-level goals into concrete sub-goals',
      priority: 0.8
    });
  }

  canApply(premise) {
    // Check if the premise contains a goal task with sufficient priority
    if (premise.type !== 'Task' || !premise.task) return false;
    
    const task = premise.task;
    const isGoal = task.punctuation === '!';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    return isGoal && priority > 0.05;
  }

  generatePrompt(premise) {
    const task = premise.task;
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Decompose this goal into 3-5 concrete, actionable sub-goals that would help achieve it: "${termStr}". Provide them as a numbered list.`;
  }

  processLMOutput(lmResponse, premise) {
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

  generateTasks(processedOutput, premise) {
    const newTasks = [];
    
    if (Array.isArray(processedOutput) && processedOutput.length > 0) {
      for (const subGoal of processedOutput) {
        if (subGoal && subGoal.trim()) {
          const trimmedGoal = subGoal.trim();
          // Convert to a more formal Narsese format
          const narseseGoal = trimmedGoal.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w!_]/g, '') + '!'; // Remove special characters, keep the goal mark
          
          const newTask = {
            term: narseseGoal,
            punctuation: '!',
            truth: { frequency: 0.8, confidence: 0.7 },
            parent: premise.task.term || premise.task
          };
          
          newTasks.push(newTask);

          // Also create a belief linking the sub-goal to the original goal
          if (premise.task.term) {
            const originalTerm = premise.task.term.toString ? premise.task.term.toString() : 
                                premise.task.term.replace ? premise.task.term.replace(/[!?]/g, '') : 
                                String(premise.task.term).replace(/[!?]/g, '');
            const termForLink = trimmedGoal.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
            const linkTerm = `(${termForLink} ==> ${originalTerm.replace(/\s+/g, '_').replace(/[^\w_]/g, '')}).`;
            
            const beliefTask = {
              term: linkTerm,
              punctuation: '.',
              truth: { frequency: 0.9, confidence: 0.8 }
            };
            
            newTasks.push(beliefTask);
          }
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
      console.error(`Error in GoalDecompositionRule:`, error);
      return [];
    }
  }
}