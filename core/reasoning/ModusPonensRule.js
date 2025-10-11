import { InferenceRule } from '../Reasoner.js';
import { TermType } from '../Term.js';
import { Task, Punctuation, TruthValue } from '../Task.js';

/**
 * Implements the modus ponens inference rule.
 * This rule derives B from (A ==> B) and A.
 */
export class ModusPonens extends InferenceRule {
  /**
   * This rule is triggered by an Implication term.
   */
  getTriggerTermType() {
    return TermType.IMPLICATION;
  }

  /**
   * Applies the modus ponens rule.
   *
   * Given a premise (A ==> B). (an implication), it looks for a second premise A.
   * (the antecedent as a belief) in memory to derive the conclusion B.
   *
   * @param {Task} implicationTask - The implication task (A ==> B)
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The current cycle's context
   * @returns {Task[]} Array of derived tasks
   */
  apply(implicationTask, memory, context) {
    const derived = [];

    if (implicationTask.term.subject && implicationTask.term.predicate && implicationTask.truth) {
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
            context.currentTime,
            context.currentTime
          );

          derived.push(newTask);
        }
      }
    }
    return derived;
  }
}