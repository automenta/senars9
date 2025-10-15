import { LMRule } from '../../Rule.js';

export class MetaReasoningGuidanceRule extends LMRule {
  constructor(lm) {
    super('meta-reasoning-guidance', lm, {
      name: 'Meta-Reasoning Guidance Rule',
      description: 'Provides reasoning strategy recommendations for complex problems',
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
    
    const termStr = task.term ? task.term.toString() : '';
    const isGoal = task.punctuation === '!';
    const isQuestion = task.punctuation === '?';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    // Apply to high-priority goals or complex questions
    const hasComplexityTerms = /solve|achieve|ensure|maintain|optimize|balance|maximize|minimize|understand|analyze|investigate|find|discover|resolve|handle|deal with|address|tackle|approach|handle|manage|coordinate|integrate|combine|compare|evaluate|assess|plan|design|create|develop|implement|execute|monitor|review|improve|enhance|refine|adjust|adapt|modify|transform|restructure|reorganize|rethink|reconsider|investigate|explore|examine|study|research|probe|inquire|question|analyze|examine|scrutinize|assess|appraise|gauge|estimate|predict|forecast|anticipate|project|plan|schedule|organize|arrange|coordinate|align|match|pair|connect|link/i.test(termStr);
    
    return (isGoal || isQuestion) && priority > 0.5 && hasComplexityTerms;
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
      throw new Error('No task provided to generate prompt for MetaReasoningGuidanceRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `For this complex goal or question: "${termStr}", what is the most effective reasoning strategy to approach it? Consider if forward chaining, backward chaining, breadth-first, depth-first search, decomposition, analogy, abduction, or other methods would be most appropriate. Also consider what information might be needed.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM's strategy recommendation
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    if (processedOutput && processedOutput.trim()) {
      const originalTerm = context.premise?.task?.term?.toString() || 'unknown';
      
      // Create a strategy recommendation belief
      newTasks.push({
        term: `reasoning_strategy_for_${originalTerm.replace(/[^\w]/g, '_')}`,
        punctuation: '.',
        truth: { frequency: 0.9, confidence: 0.8 },
        content: processedOutput
      });
      
      // Create a meta-reasoning belief that can guide future processing
      newTasks.push({
        term: `(recommended_strategy --> "${processedOutput}").`,
        punctuation: '.',
        truth: { frequency: 0.9, confidence: 0.8 }
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
      console.error(`Error in MetaReasoningGuidanceRule:`, error);
      return [];
    }
  }
}