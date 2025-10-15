/**
 * @file core/reasoning/nal/NALRules.js
 * @description NAL-specific inference rules
 */

import { NALRule } from '../Rule.js';

/**
 * Deduction rule for NAL reasoning
 */
export class DeductionRule extends NALRule {
  constructor(options = {}) {
    super('nal-deduction', {
      name: 'NAL Deduction Rule',
      description: 'Performs deduction: If <A --> B> and <A> then <B>',
      priority: 0.9,
      ...options
    });
  }

  canApply(context) {
    // Check if context contains tasks suitable for deduction
    const tasks = context.tasks || [];
    return tasks.some(task => 
      task.punctuation === '.' && // Belief
      task.term && 
      (task.term.includes(' --> ') || task.term.includes(' ==> '))
    );
  }

  async performInference(context) {
    const tasks = context.tasks || [];
    const results = [];

    for (const task of tasks) {
      if (task.punctuation === '.' && task.term?.includes(' --> ')) {
        // Parse implication: A --> B
        const match = task.term.match(/\(([^)]+)\) --> \(([^)]+)\)/);
        if (match) {
          const [, antecedent, consequent] = match;
          
          // Check if antecedent exists in tasks to confirm
          const antecedentExists = tasks.some(t => 
            t.term === antecedent && t.punctuation === '.'
          );
          
          if (antecedentExists) {
            const truth = this.applyTruthFunction(task.truth, { type: 'deduction' });
            
            results.push({
              term: `(${consequent}).`,
              punctuation: '.',
              truth: truth,
              derivationPath: ['nal:deduction', this.id],
              parent: [task]
            });
          }
        }
      }
    }

    return results;
  }
}

/**
 * Induction rule for NAL reasoning
 */
export class InductionRule extends NALRule {
  constructor(options = {}) {
    super('nal-induction', {
      name: 'NAL Induction Rule',
      description: 'Performs induction: If <A --> B> and <B --> A> then <A <-> B>',
      priority: 0.7,
      ...options
    });
  }

  canApply(context) {
    const tasks = context.tasks || [];
    // Check for similar patterns that could be induced
    return tasks.length >= 2;
  }

  async performInference(context) {
    const tasks = context.tasks || [];
    const results = [];

    // Simple induction: if multiple tasks have similar patterns, induce a general rule
    const patternMap = new Map();
    
    for (const task of tasks) {
      if (task.punctuation === '.' && task.term) {
        // Extract pattern from term
        const pattern = this.extractPattern(task.term);
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, []);
        }
        patternMap.get(pattern).push(task);
      }
    }

    // If multiple tasks share the same pattern, create an inductive generalization
    for (const [pattern, similarTasks] of patternMap) {
      if (similarTasks.length >= 2) {
        // Calculate average truth from similar tasks
        const avgFreq = similarTasks.reduce((sum, t) => sum + (t.truth?.frequency || 0.9), 0) / similarTasks.length;
        const avgConf = similarTasks.reduce((sum, t) => sum + (t.truth?.confidence || 0.8), 0) / similarTasks.length;
        
        const truth = this.applyTruthFunction({ frequency: avgFreq, confidence: avgConf }, { type: 'induction' });
        
        results.push({
          term: `(${pattern} <-> ${pattern}).`,
          punctuation: '.',
          truth: truth,
          derivationPath: ['nal:induction', this.id],
          parent: similarTasks
        });
      }
    }

    return results;
  }

  extractPattern(term) {
    // Extract the core pattern for grouping
    return term.replace(/[()]/g, '').split(' ')[0];
  }
}

/**
 * Abduction rule for NAL reasoning
 */
export class AbductionRule extends NALRule {
  constructor(options = {}) {
    super('nal-abduction', {
      name: 'NAL Abduction Rule',
      description: 'Performs abduction: If <A --> B> and <B> then <A>',
      priority: 0.6,
      ...options
    });
  }

  canApply(context) {
    const tasks = context.tasks || [];
    // Check for question tasks or tasks that could use abductive reasoning
    return tasks.some(task => task.punctuation === '?' || 
                           (task.punctuation === '.' && task.term?.includes(' --> ')));
  }

  async performInference(context) {
    const tasks = context.tasks || [];
    const questionTasks = tasks.filter(task => task.punctuation === '?');
    const results = [];

    for (const questionTask of questionTasks) {
      // Simple abductive hypothesis generation based on question patterns
      const truth = this.applyTruthFunction(null, { type: 'abduction' });
      
      results.push({
        term: `(${questionTask.term.replace('?', '')} ? hypothesis).`,
        punctuation: '.',
        truth: truth,
        derivationPath: ['nal:abduction', this.id],
        parent: [questionTask]
      });
    }

    return results;
  }
}