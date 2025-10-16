import { LMRule } from '../../Rule.js';

export class BeliefRevisionRule extends LMRule {
  constructor(lm) {
    super('belief-revision', lm, {
      name: 'Belief Revision Rule',
      description: 'Helps resolve contradictions by suggesting belief revisions',
      priority: 0.9
    });
  }

  hasConflictTerms(termStr) {
    return /contradict|conflict|inconsist|oppos|vs|versus|vs\./i.test(termStr);
  }

  canApply(context) {
    const task = this.extractTask(context);
    if (!task) return false;

    const {termStr, punctuation, priority} = this.analyzeTask(task);
    const isBelief = punctuation === '.' || punctuation === '?';
    return (isBelief && priority > 0.1) && this.hasConflictTerms(termStr);
  }

  generatePrompt(context) {
    const task = this.extractTask(context);
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
    const originalTask = this.extractTask(context);
    
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
    if (!this.canApply(context)) return [];
    try {
      const lmResponse = await this.executeLMProcessing(context);
      const processedOutput = this.processLMOutput(lmResponse, context);
      return this.generateTasks(processedOutput, context);
    } catch (error) {
      console.error(`Error in BeliefRevisionRule:`, error);
      return [];
    }
  }
}