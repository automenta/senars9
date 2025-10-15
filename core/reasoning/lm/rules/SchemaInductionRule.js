/**
 * @file core/reasoning/lm/rules/SchemaInductionRule.js
 * @description Schema induction rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class SchemaInductionRule extends LMRule {
  constructor(lm) {
    super('schema-induction', lm, {
      name: 'Schema Induction Rule',
      description: 'Extracts action schemas from narrative or instruction sequences',
      priority: 0.6
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
    
    // Apply to beliefs that contain narrative or procedural information
    const hasNarrativeTerms = /when.*then|if.*then|first.*then|after.*before|sequence|procedure|instruction|process|step|guide/i.test(termStr);
    
    return isBelief && priority > 0.1 && hasNarrativeTerms;
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
      throw new Error('No task provided to generate prompt for SchemaInductionRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `From this narrative or instruction: "${termStr}", extract a generalizable action schema or procedure. Express it as a temporal sequence or conditional relationship that could apply to similar situations.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM's schema extraction
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    if (processedOutput && processedOutput.trim()) {
      // Create a procedural belief based on the extracted schema
      const schemaTerm = `schema_${(context.premise?.task?.term || 'unknown').toString().replace(/[^\w]/g, '_')}`;
      
      newTasks.push({
        term: `(${processedOutput}) --> procedural_knowledge.`,
        punctuation: '.',
        truth: { frequency: 0.8, confidence: 0.7 }
      });
      
      // Create a temporal action schema
      newTasks.push({
        term: `action_schema("${processedOutput}").`,
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
      console.error(`Error in SchemaInductionRule:`, error);
      return [];
    }
  }
}