/**
 * @file core/reasoning/lm/rules/GoalDecompositionRule.js
 * @description Goal decomposition rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';
import { Term, TermType } from '../../../Term.js';
import { Task, Punctuation } from '../../../Task.js';

const 
  /** creates a subgoal directly */
  inputSubGoal = true, 

  /** creates implication belief connecting the goal to the subgoal */
  inputImplication = false;

export class GoalDecompositionRule extends LMRule {
  constructor(lm, config = {}) {
    super('goal-decomposition', lm, {
      name: 'Goal Decomposition Rule',
      description: 'Breaks down high-level goals into concrete sub-goals',
      priority: 0.8
    });

    // Enhanced configuration for better LM responses
    this.config = {
      temperature: 0.7,
      maxTokens: 800,
      timeout: 15000, // 15 seconds
      minSubGoals: 2,
      maxSubGoals: 6,
      minGoalLength: 5,
      maxGoalLength: 200,
      ...config
    };
  }

  canApply(context) {
    // Validate LM provider is available first
    if (!this.lm) {
      console.warn('GoalDecompositionRule: No LM provider available');
      return false;
    }

    // Extract task from context using simplified logic
    const task = this._extractTaskFromContext(context);
    if (!task) return false;

    // Check if it's a goal with sufficient priority
    const isGoal = task.punctuation === '!' || task.punctuation === Punctuation.GOAL;
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);

    return isGoal && priority > 0.05;
  }

  _extractTaskFromContext(context) {
    // Simplified context handling - prioritize the most common format
    if (context.premise?.task) {
      return context.premise.task;
    }

    if (context.premise1) {
      return context.premise1;
    }

    if (Array.isArray(context.tasks) && context.tasks.length > 0) {
      return context.tasks[0];
    }

    // Fallback: check if context is the task itself
    if (context.term && (context.punctuation === '!' || context.punctuation === Punctuation.GOAL)) {
      return context;
    }

    return null;
  }

  generatePrompt(context) {
    const task = this._extractTaskFromContext(context);
    if (!task) {
      throw new Error('No task provided to generate prompt for GoalDecompositionRule');
    }

    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);

    // Enhanced prompt with better instructions for more reliable responses
    return `Decompose the goal into between ${this.config.minSubGoals}..${this.config.maxSubGoals} specific, actionable sub-goals:

Goal: "${termStr}"

Requirements for sub-goals:
- Each should be concrete and measurable
- Should be smaller tasks that contribute to the main goal
- Should be realistic and achievable
- Avoid vague or abstract language

Provide each sub-goal on its own line, with no other output.`;
  }

  processLMOutput(lmResponse, context) {
    if (!lmResponse || typeof lmResponse !== 'string') {
      console.warn('GoalDecompositionRule: Invalid LM response received');
      return [];
    }

    const subGoals = [];
    const lines = lmResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Enhanced parsing with multiple strategies
    for (const line of lines) {
      // Strategy 1: Numbered lists (1. , 2. , etc.)
      const numberedMatch = line.match(/^\d+[\.)]\s*(.+)$/);
      if (numberedMatch) {
        const goal = this._cleanSubGoal(numberedMatch[1]);
        if (goal && this._isValidSubGoal(goal)) {
          subGoals.push(goal);
        }
        continue;
      }

      // Strategy 2: Bullet points (- , * , •)
      const bulletMatch = line.match(/^[-*•]\s*(.+)$/);
      if (bulletMatch) {
        const goal = this._cleanSubGoal(bulletMatch[1]);
        if (goal && this._isValidSubGoal(goal)) {
          subGoals.push(goal);
        }
        continue;
      }

      // Strategy 3: Lines that look like action items (no numbering or bullets)
      if (line.length > this.config.minGoalLength &&
          line.length < this.config.maxGoalLength &&
          this._looksLikeActionItem(line)) {
        const goal = this._cleanSubGoal(line);
        if (goal && this._isValidSubGoal(goal)) {
          subGoals.push(goal);
        }
      }
    }

    // Limit the number of sub-goals to prevent overwhelming the system
    return subGoals.slice(0, this.config.maxSubGoals);
  }

  _cleanSubGoal(goal) {
    if (!goal) return '';

    // Remove quotes if they wrap the entire goal
    goal = goal.trim();
    if ((goal.startsWith('"') && goal.endsWith('"')) ||
        (goal.startsWith("'") && goal.endsWith("'"))) {
      goal = goal.slice(1, -1);
    }

    // Remove trailing punctuation that's not part of the goal
    goal = goal.replace(/[.:;!?\s]+$/, '');

    return goal.trim();
  }

  _isValidSubGoal(goal) {
    if (!goal || goal.length < this.config.minGoalLength) return false;
    if (goal.length > this.config.maxGoalLength) return false;

    // Check for obviously invalid content
    const lowerGoal = goal.toLowerCase();
    if (lowerGoal.includes('error') || lowerGoal.includes('sorry') || lowerGoal.includes('cannot')) {
      return false;
    }

    return true;
  }

  _looksLikeActionItem(line) {
    // Check if line starts with action verbs or contains actionable language
    const actionStarters = [
      'create', 'establish', 'implement', 'ensure', 'improve', 'develop',
      'increase', 'reduce', 'build', 'design', 'plan', 'organize',
      'research', 'analyze', 'evaluate', 'test', 'deploy', 'maintain',
      'update', 'review', 'document', 'train', 'coordinate', 'manage'
    ];

    const lowerLine = line.toLowerCase();
    return actionStarters.some(starter => lowerLine.startsWith(starter)) ||
           lowerLine.includes(' by ') ||
           lowerLine.includes(' using ') ||
           lowerLine.includes(' with ');
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];

    const originalTask = this._extractTaskFromContext(context);
    if (!originalTask) {
      console.warn('GoalDecompositionRule: No original task found for generating sub-tasks');
      return newTasks;
    }

    if (!Array.isArray(processedOutput) || processedOutput.length === 0) {
      console.warn('GoalDecompositionRule: No processed output to generate tasks from');
      return newTasks;
    }

    // Inherit truth values from original task, but slightly reduce confidence
    const originalTruth = originalTask.truth || { frequency: 0.8, confidence: 0.8 };
    const inheritedTruth = {
      frequency: Math.min(originalTruth.frequency, 0.9), // Cap at 0.9 to show some uncertainty
      confidence: Math.max(originalTruth.confidence * 0.8, 0.5) // Reduce confidence but not below 0.5
    };

    for (let i = 0; i < processedOutput.length; i++) {
      const subGoal = processedOutput[i];
      if (!subGoal || !subGoal.trim()) continue;

      try {
        var trimmedGoal = subGoal.trim();

        // Validate the sub-goal before creating a task
        if (trimmedGoal.length < this.config.minGoalLength ||
            trimmedGoal.length > this.config.maxGoalLength) {
          console.warn(`GoalDecompositionRule: Sub-goal length ${trimmedGoal.length} outside valid range`);
          continue;
        }

        const when = Date.now(); //TODO use the time of the input task

        const newTerm = Term.newAtom(trimmedGoal);

        const newTask = new Task(
          newTerm,
          '!', // Sub-goals are goals
          inheritedTruth,
          when,
          when,
          0.8, // priority for sub-goals
          null // TODO inherit stamp
        );

        if (inputSubGoal) 
          newTasks.push(newTask);
      
        // Create implication link: sub-goal → original goal
        if (inputImplication && originalTask && originalTask.term) {
          //try {
            const inputGoal = Term.newAtom(originalTask.term); //HACK

            const linkTerm = Term.createCompound(TermType.IMPLICATION, [newTerm, inputGoal]);

            const linkTruth = {
              frequency: inheritedTruth.frequency * 0.9, // Slightly reduce for the implication
              confidence: inheritedTruth.confidence * 0.9
            };

            const beliefTask = new Task(
              linkTerm,
              '.',
              linkTruth,
              when,
              when,
              0.7, // priority for implication beliefs
              null // TODO inherit stamp
            );

            newTasks.push(beliefTask);
          //} catch (linkError) {            
          //  console.warn('GoalDecompositionRule: Failed to create implication link:', linkError.message);
          //}
        }
      } catch (error) {
        console.error(`GoalDecompositionRule: Error creating task for sub-goal "${subGoal}":`, error.message);
      }
    }

    return newTasks;
  }

  async apply(context) {
    try {
      if (!this.canApply(context)) {
        return [];
      }

      // Execute LM processing with enhanced configuration
      const lmOptions = {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        timeout: this.config.timeout
      };

      //console.log(`GoalDecompositionRule: Processing goal with LM (temp=${lmOptions.temperature}, maxTokens=${lmOptions.maxTokens})`);

      const lmResponse = await this.executeLMProcessing(context, lmOptions);

      if (!lmResponse) {
        console.warn('GoalDecompositionRule: No response received from LM provider');
        return [];
      }

      const processedOutput = this.processLMOutput(lmResponse, context);

      if (processedOutput.length === 0) {
        console.warn('GoalDecompositionRule: No valid sub-goals extracted from LM response');
        return [];
      }

      //console.log(`GoalDecompositionRule: Successfully generated ${processedOutput.length} sub-goals`);

      const newTasks = this.generateTasks(processedOutput, context);
      return newTasks || [];

    } catch (error) {
      console.error(`GoalDecompositionRule: Error during goal decomposition:`, error.message);

      // Provide more specific error information
      if (error.message.includes('timeout')) {
        console.error('GoalDecompositionRule: LM provider timed out - consider increasing timeout or checking provider availability');
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        console.error('GoalDecompositionRule: Network error - check LM provider connectivity');
      } else if (error.message.includes('auth')) {
        console.error('GoalDecompositionRule: Authentication error - check LM provider credentials');
      }

      return [];
    }
  }
}
