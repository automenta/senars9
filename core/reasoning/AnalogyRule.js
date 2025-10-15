import { NALRule } from '../Reasoner.js';
import { Term, TermType } from '../Term.js';
import { Task, Punctuation } from '../Task.js';

/**
 * Implements the analogy rule.
 * This rule derives ((S --> M) ==> (P --> M)) from (S <-> P)
 */
export class Analogy extends NALRule {
  getTriggerTermType() {
    return TermType.SIMILARITY;
  }

  apply({ premise1, memory, context }) {
    const derived = [];
    if (premise1.term.subject && premise1.term.predicate && premise1.truth) {
      const s = premise1.term.subject;
      const p = premise1.term.predicate;
      const truth1 = premise1.truth;

      // Find common predicates for s and p
      const s_predicates = memory.getInheritanceBySubject(s);
      const p_predicates = memory.getInheritanceBySubject(p);

      if (!s_predicates || !p_predicates) return derived;

      for (const sp of s_predicates) {
        for (const pp of p_predicates) {
          if (sp.term.predicate.hash === pp.term.predicate.hash) {
            const m = sp.term.predicate;

            // Create new term ((S --> M) ==> (P --> M))
            const sm = Term.createCompound(TermType.INHERITANCE, [s, m]);
            const pm = Term.createCompound(TermType.INHERITANCE, [p, m]);
            const newTerm = Term.createCompound(TermType.IMPLICATION, [sm, pm]);

            const truth2 = sp.truth;
            const truth3 = pp.truth;

            const newTruth = truth1.constructor.analogy(truth1, truth2, truth3);

            const newTask = Task.createDerived(
              [premise1, sp, pp],
              newTerm,
              Punctuation.BELIEF,
              newTruth,
              context.currentTime,
              context.currentTime
            );
            derived.push(newTask);
          }
        }
      }
    }
    return derived;
  }
}
