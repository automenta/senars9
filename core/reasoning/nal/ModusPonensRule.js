import { NALRule } from '../Rule.js';
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
    // Check if we have a premise with an implication term
    const { premise, memory } = context;
    if (!premise || !premise.task || !memory) return false;

    const task = premise.task;
    return task.term && task.term.termType === TermType.IMPLICATION;
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
    const { premise, memory, tasks } = context;
    const derived = [];

    if (!premise || !premise.task || !memory) return derived;

    const implicationTask = premise.task;
    
    if (implicationTask.term && implicationTask.term.termType === TermType.IMPLICATION && 
        implicationTask.term.subject && implicationTask.term.predicate && implicationTask.truth) {
      const antecedentTerm = implicationTask.term.subject;
      const consequentTerm = implicationTask.term.predicate;
      const implicationTruth = implicationTask.truth;

      // We have (A ==> B). We need to check if A. exists in memory.
      const antecedentTask = memory.getTask(antecedentTerm.hash);

      if (antecedentTask && antecedentTask.isBelief()) {
        if (antecedentTask.truth) {
          // A. exists with a truth value. Derive B.
          // The conclusion is simply the consequent term B.

          // Calculate the truth value for the conclusion using the detachment function.
          const newTruth = TruthValue.detachment(antecedentTask.truth, implicationTruth);

          const newTask = new Task(
            consequentTerm,
            Punctuation.BELIEF,
            newTruth,
            Date.now(),
            Date.now()
          );

          derived.push(newTask);
        }
      }
    }
    return derived;
  }
}