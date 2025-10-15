/**
 * @file core/reasoning/lm/rules/TemporalCausalModelingRule.js
 * @description Temporal and causal modeling rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class TemporalCausalModelingRule extends LMRule {
  constructor(lm) {
    super('temporal-causal-modeling', lm, {
      name: 'Temporal/Causal Modeling Rule',
      description: 'Infers time order and causal relationships from text',
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
    
    const termStr = task.term ? task.term.toString() : '';
    const isBelief = task.punctuation === '.';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    // Apply to beliefs that contain temporal or causal keywords
    const hasTemporalCausalTerms = /before|after|when|then|while|during|causes|leads to|results in|because|since|due to|as a result|consequently|therefore|thus|if.*then|first.*then|eventually|subsequently|precedes|follows|causal|temporal|time|sequence|order|trigger|effect|outcome|impact|influence/i.test(termStr);
    
    return isBelief && priority > 0.1 && hasTemporalCausalTerms;
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
      throw new Error('No task provided to generate prompt for TemporalCausalModelingRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Analyze the temporal and causal relationships in this statement: "${termStr}". Identify the cause(s), effect(s), and the time sequence if applicable. Express the relationships as formal causal and temporal logic statements.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM's temporal/causal analysis
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    if (processedOutput && processedOutput.trim()) {
      // Create a causal relationship belief
      const originalTerm = context.premise?.task?.term?.toString() || 'unknown';
      
      newTasks.push({
        term: `causal_model_of_${originalTerm.replace(/[^\w]/g, '_')}`,
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 },
        content: processedOutput
      });
      
      // Create a temporal relationship if identified
      newTasks.push({
        term: `(temporal_causal_analysis --> "${processedOutput}").`,
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 }
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
      console.error(`Error in TemporalCausalModelingRule:`, error);
      return [];
    }
  }
}