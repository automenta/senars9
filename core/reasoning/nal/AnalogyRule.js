import { NALRule } from '../Rule.js';
import { Term, TermType } from '../../Term.js';
import { Task, Punctuation } from '../../Task.js';

/**
 * Implements the analogy rule.
 * This rule derives ((S --> M) ==> (P --> M)) from (S <-> P)
 */
export class Analogy extends NALRule {
  constructor(options = {}) {
    super('analogy', options);
  }

  canApply(context) {
    // New context format from reasoner
    const task = context.premise && context.premise.task ? context.premise.task : null;
    return task && task.term && task.term.termType === TermType.SIMILARITY;
  }

  apply(context) {
    const derived = [];

    // New context format from reasoner
    const premiseTask = context.premise && context.premise.task ? context.premise.task : null;
    const memory = context.memory;
    
    if (!premiseTask || !memory || !premiseTask.term.subject || !premiseTask.term.predicate || !premiseTask.truth) {
      return derived;
    }

    const s = premiseTask.term.subject;
    const p = premiseTask.term.predicate;
    const truth1 = premiseTask.truth;

    // Find common predicates for s and p
    let s_predicates, p_predicates;
    
    if (memory.getInheritanceBySubject) {
      s_predicates = memory.getInheritanceBySubject(s) || [];
      p_predicates = memory.getInheritanceBySubject(p) || [];
    } else {
      // Fallback: find tasks with s and p as subjects
      const allTasks = Array.from(memory.getAllTasks ? (memory.getAllTasks().values() || []) : []);
      s_predicates = allTasks.filter(t => t.term && 
                                      t.term.termType === TermType.INHERITANCE && 
                                      t.term.subject && 
                                      t.term.subject.hash === s.hash);
      p_predicates = allTasks.filter(t => t.term && 
                                      t.term.termType === TermType.INHERITANCE && 
                                      t.term.subject && 
                                      t.term.subject.hash === p.hash);
    }

    if (!s_predicates || !p_predicates) return derived;

    for (const sp of s_predicates) {
      for (const pp of p_predicates) {
        if (sp.term.predicate.hash === pp.term.predicate.hash) {
          const m = sp.term.predicate;

          // Create new term ((S --> M) ==> (P --> M))
          const sm = Term.createCompound(TermType.INHERITANCE, [s, m]);
          const pm = Term.createCompound(TermType.IMPLICATION, [p, m]);
          const newTerm = Term.createCompound(TermType.IMPLICATION, [sm, pm]);

          const truth2 = sp.truth;
          const truth3 = pp.truth;

          // Calculate new truth value for analogy
          const newFreq = Math.min(truth1.frequency, truth2.frequency, truth3.frequency);
          const newConf = truth1.confidence * truth2.confidence * truth3.confidence;
          const newTruth = { frequency: newFreq, confidence: newConf };

          // Get current time from context
          const currentTime = context.context?.currentTime || Date.now();

          const newTask = Task.createDerived(
            [premiseTask, sp, pp],
            newTerm,
            Punctuation.BELIEF,
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