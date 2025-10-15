import { NALRule } from '../Reasoner.js';
import { TermType } from '../Term.js';
import { Task, Punctuation, TruthValue } from '../Task.js';

/**
 * Implements the modus ponens inference rule.
 * This rule derives B from (A ==> B) and A.
 */
export class ModusPonens extends NALRule {
  /**
   * This rule is triggered by an Implication term.
   */
  getTriggerTermType() {
    return TermType.IMPLICATION;
  }

  /**
   * Applies modus ponens.
   * Premise1 is the implication (A ==> B).
   * It looks for premise2, which is the antecedent (A).
   */
  apply({ premise1, memory, context }) {
    const derived = [];
    const implicationTerm = premise1.term;
    const antecedent = implicationTerm.subject;
    const consequent = implicationTerm.predicate;

    // Search for the antecedent as a belief in memory.
    const antecedentBeliefs = memory.getImplicationsByPremise(antecedent);

    if (!antecedentBeliefs) return derived;

    for (const belief of antecedentBeliefs) {
      // Calculate the truth value of the derived consequent.
      const newTruth = TruthValue.deduction(premise1.truth, belief.truth);

      // Create the new derived task for the consequent.
      const newTask = Task.createDerived(
        [premise1, belief],
        consequent,
        Punctuation.BELIEF,
        newTruth,
        context.currentTime,
        context.currentTime
      );
      derived.push(newTask);
    }

    return derived;
  }
}
