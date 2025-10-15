import { LMRule } from '../../Rule.js';

export class ExplanationGenerationRule extends LMRule {
  constructor(lm) {
    super('explanation-generation', lm, {
      name: 'Explanation Generation Rule',
      description: 'Generates natural language explanations for formal conclusions',
      priority: 0.5
    });
  }

  hasComplexRelation(termStr) {
    return /==>|<=>|=/g.test(termStr);
  }

  canApply(context) {
    const task = this.extractTask(context);
    if (!task) return false;

    const {termStr, punctuation, priority} = this.analyzeTask(task);
    const isBelief = punctuation === '.';
    return isBelief && priority > 0.1 && this.hasComplexRelation(termStr);
  }

  generatePrompt(context) {
    const task = this.extractTask(context) || context;
    if (!task) throw new Error('No task provided to generate prompt for ExplanationGenerationRule');

    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `Provide a clear, natural language explanation for this logical statement: "${termStr}". Explain what it means in simple terms and why this relationship might be true or important.`;
  }

  processLMOutput(lmResponse, context) {
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];

    if (processedOutput?.trim()) {
      const originalTerm = context.premise?.task?.term?.toString() || 'unknown';
      const sanitizedTerm = originalTerm.replace(/[^\w]/g, '_');

      newTasks.push(
        {
          term: `explanation_of_${sanitizedTerm}`,
          punctuation: '.',
          truth: { frequency: 0.95, confidence: 0.9 },
          content: processedOutput
        },
        {
          term: `(formal_statement_explained --> "${processedOutput}").`,
          punctuation: '.',
          truth: { frequency: 0.95, confidence: 0.9 }
        }
      );
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
      console.error(`Error in ExplanationGenerationRule:`, error);
      return [];
    }
  }
}