import { NALRule } from '../NALRule.js';
import { TermType } from '../../Term.js';
import { Task, Punctuation, TruthValue } from '../../Task.js';

/**
 * Implements the modus ponens inference rule.
 * This rule derives B from (A ==> B) and A.
 */
export class ModusPonensRule extends NALRule {
  constructor(options = {}) {
    super('modus_ponens', options);
  }

  /**
   * Determines if the rule can be applied to the given context
   * @param {object} context - The reasoning context containing premises, memory, etc.
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(context) {
    // New context format from reasoner
    const task = context.premise && context.premise.task ? context.premise.task : null;
    return task && task.term && task.term.termType === TermType.IMPLICATION;
  }

  /**
   * Applies the modus ponens rule.
   *
   * Given a premise (A ==> B). (an implication), it looks for a second premise A.
   * (the antecedent as a belief) in memory to derive the conclusion B.
   *
   * @param {object} context - The reasoning context
   * @returns {Promise<any>} Results from rule application
   */
  async apply(context) {
    const derived = [];

    // New context format from reasoner
    const implicationTask = context.premise && context.premise.task ? context.premise.task : null;
    const memory = context.memory;
    const currentTime = context.context?.currentTime;
    if (currentTime === undefined) {
      throw new Error('Context must provide currentTime for proper time tracking');
    }
    
    if (!implicationTask || !memory) return derived;

    if (implicationTask.term && implicationTask.term.termType === TermType.IMPLICATION && 
        implicationTask.term.subject && implicationTask.term.predicate && implicationTask.truth) {
      const antecedentTerm = implicationTask.term.subject;
      const consequentTerm = implicationTask.term.predicate;
      const implicationTruth = implicationTask.truth;

      // We have (A ==> B). We need to check if A. exists in memory.
      // Try to get the antecedent task from memory using various methods
      let antecedentTask = memory.getTask(antecedentTerm.hash);
      if (!antecedentTask) {
        // Try by term name as fallback for test framework
        if (memory.getByTermName) {
          antecedentTask = memory.getByTermName(antecedentTerm.name);
        } else if (memory.getAllTasks) {
          antecedentTask = Array.from(memory.getAllTasks().values() || [])
            .find(t => t.term && t.term.name === antecedentTerm.name);
        }
      }

      if (antecedentTask && (typeof antecedentTask.isBelief === 'function' ? antecedentTask.isBelief() : 
                           (antecedentTask.punctuation === '.' || antecedentTask.punctuation === Punctuation.BELIEF))) {
        if (antecedentTask.truth) {
          // A. exists with a truth value. Derive B.
          // The conclusion is simply the consequent term B.

          // Calculate the truth value for the conclusion - use simple combination for now
          const newFreq = Math.min(implicationTruth.frequency, antecedentTask.truth.frequency);
          const newConf = implicationTruth.confidence * antecedentTask.truth.confidence;
          const newTruth = { frequency: newFreq, confidence: newConf };

          const newTask = new Task(
            consequentTerm,
            '.', // belief punctuation
            newTruth,
            currentTime,
            currentTime
          );

          derived.push(newTask);
        }
      }
    }
    return derived;
  }
}