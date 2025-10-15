/**
 * @file core/reasoning/lm/rules/UncertaintyCalibrationRule.js
 * @description Uncertainty calibration rule for the LM Reasoning API
 */

import { LMRule } from '../../Rule.js';

export class UncertaintyCalibrationRule extends LMRule {
  constructor(lm) {
    super('uncertainty-calibration', lm, {
      name: 'Uncertainty Calibration Rule',
      description: 'Maps LM confidence estimates to NARS truth values for uncertainty management',
      priority: 0.7
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
    const isBelief = task.punctuation === '.' || task.punctuation === '?';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    // Apply to beliefs that contain uncertainty indicators
    const hasUncertaintyTerms = /maybe|perhaps|likely|unlikely|uncertain|probably|possibly|possibly|tend to|often|seldom|some|most|few|many|generally|usually|sometimes|often|frequently|infrequently|always|never|all|some|few|most|majority|minority|major|minor|significant|slight|high|low|medium|small|big|large|big|large|small/i.test(termStr);
    
    return isBelief && priority > 0.1 && hasUncertaintyTerms;
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
      throw new Error('No task provided to generate prompt for UncertaintyCalibrationRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Assess the level of certainty/uncertainty in this statement: "${termStr}". Provide a confidence level as a number between 0 and 1, where 0 is completely uncertain and 1 is completely certain. Also explain what makes this statement uncertain.`;
  }

  processLMOutput(lmResponse, context) {
    // Extract confidence level from the LM response
    const match = lmResponse.match(/(\d+\.?\d*)/);
    let confidence = 0.7; // Default confidence
    
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value >= 0 && value <= 1) {
        confidence = value;
      } else if (!isNaN(value)) {
        // If it's a percentage (0-100), normalize it
        confidence = Math.min(1.0, Math.max(0.0, value / 100));
      }
    }
    
    return {
      confidence: confidence,
      explanation: lmResponse
    };
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    // Get the original term
    const originalTerm = context.premise?.task?.term?.toString() || 'unknown';
    
    if (processedOutput && typeof processedOutput === 'object') {
      // Calculate NARS truth values based on LM confidence estimate
      const frequency = 0.5; // Default frequency, could be derived from content
      const confidence = Math.max(0.01, Math.min(0.99, processedOutput.confidence)); // Keep between 0.01 and 0.99
      
      // Create a calibrated belief with adjusted truth values
      newTasks.push({
        term: originalTerm,
        punctuation: '.',
        truth: { 
          frequency: frequency, 
          confidence: confidence 
        },
        content: processedOutput.explanation
      });
      
      // Create a meta-belief about the uncertainty assessment
      newTasks.push({
        term: `(uncertainty_assessment_for_${originalTerm.replace(/[^\w]/g, '_')} --> confidence_${confidence}).`,
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
      console.error(`Error in UncertaintyCalibrationRule:`, error);
      return [];
    }
  }
}