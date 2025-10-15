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
    // Handle both old and new context formats
    let task;
    if (context.premise && context.premise.task) {
      // New context format from reasoner
      task = context.premise.task;
    } else if (context.premise1) {
      // Old context format
      task = context.premise1;
    } else {
      return false;
    }
    return task.term && task.term.termType === TermType.SIMILARITY;
  }

  apply(context) {
    const derived = [];

    // Handle both old and new context formats
    let premiseTask;
    let memory;
    
    if (context.premise && context.premise.task) {
      // New context format from reasoner
      premiseTask = context.premise.task;
      memory = context.memory;
    } else if (context.premise1 && context.memory) {
      // Old context format
      premiseTask = context.premise1;
      memory = context.memory;
    } else {
      return derived;
    }
    
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
          const pm = Term.createCompound(TermType.INHERITANCE, [p, m]);
          const newTerm = Term.createCompound(TermType.IMPLICATION, [sm, pm]);

          const truth2 = sp.truth;
          const truth3 = pp.truth;

          // Calculate new truth value for analogy
          const newFreq = Math.min(truth1.frequency, truth2.frequency, truth3.frequency);
          const newConf = truth1.confidence * truth2.confidence * truth3.confidence;
          const newTruth = { frequency: newFreq, confidence: newConf };

          // Get current time from context
          const currentTime = context.currentTime || context.context?.currentTime || Date.now();

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