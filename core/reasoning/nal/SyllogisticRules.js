import { NALRule } from '../Rule.js';
import { Term, TermType } from '../../Term.js';
import { Task, Punctuation } from '../../Task.js';

/**
 * A generic helper function to apply syllogistic inference rules.
 *
 * This function abstracts the common pattern found in rules like deduction,
 * induction, and abduction:
 * 1. Take a first premise.
 * 2. Find a second premise in memory based on some criteria.
 * 3. Derive a conclusion from the two premises.
 *
 * @param {Task} premise1 - The first premise task
 * @param {Memory} memory - Reference to the system's memory
 * @param {object} context - The reasoning context
 * @param {Function} queryPremises2 - Function that takes memory and components of the first premise, returns candidate premises
 * @param {Function} constructNewTermComponents - Function that takes components of both premises and returns subject/predicate for new term
 * @param {Function} calculateNewTruth - Function that calculates the truth value of the conclusion
 * @param {boolean} excludeSelf - Whether premise1 can be used as premise2
 * @returns {Task[]} Array of derived tasks
 */
export function applySyllogisticRule(
  premise1,
  memory,
  context,
  queryPremises2,
  constructNewTermComponents,
  calculateNewTruth,
  excludeSelf
) {
  const derived = [];

  // Deconstruct the first premise
  if (premise1.term.subject && premise1.term.predicate && premise1.truth) {
    const s1 = premise1.term.subject;
    const p1 = premise1.term.predicate;
    const truth1 = premise1.truth;

    // Find candidate second premises using the provided query function
    const premise2Candidates = queryPremises2(memory, s1, p1);
    if (!premise2Candidates) return derived;

    for (const premise2 of premise2Candidates) {
      // Skip if the rule requires excluding the premise itself
      if (excludeSelf && premise1.term.hash === premise2.term.hash) {
        continue;
      }

      // Deconstruct the second premise
      if (premise2.term.subject && premise2.term.predicate && premise2.truth) {
        const s2 = premise2.term.subject;
        const p2 = premise2.term.predicate;
        const truth2 = premise2.truth;

        // Construct the new term from the components of both premises
        const [newSubject, newPredicate] = constructNewTermComponents(s1, p1, s2, p2);

        // Create the new term using the Term class
        const newTerm = Term.createCompound(TermType.INHERITANCE, [newSubject, newPredicate]);

        // Calculate the new truth value
        const newTruth = calculateNewTruth(truth1, truth2);

        // Create the new derived task with stamps from both parent tasks
        // This properly merges the evidence chains to enable overlap detection
        const newTask = Task.createDerived(
          [premise1, premise2], // Both parent tasks for proper stamp merging
          newTerm,
          Punctuation.BELIEF, // Default to belief for derived facts
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

/**
 * Base class for inheritance-based syllogistic rules.
 */
export class SyllogisticRule extends NALRule {
  constructor(id, queryFn, constructFn, truthFn, excludeSelf, options = {}) {
    super(id, options);
    this.queryFn = queryFn;
    this.constructFn = constructFn;
    this.truthFn = truthFn;
    this.excludeSelf = excludeSelf;
  }

  /**
   * Determines if the rule can be applied to the given context
   * @param {object} context - The reasoning context containing premises, memory, etc.
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(context) {
    const { premise, memory } = context;
    if (!premise || !premise.task || !memory) return false;

    const task = premise.task;
    return task.term && task.term.termType === TermType.INHERITANCE;
  }

  /**
   * Applies the syllogistic rule to derive new tasks
   * @param {object} context - The reasoning context
   * @returns {Promise<any>} Results from rule application
   */
  async apply(context) {
    const { premise, memory } = context;
    
    if (!premise || !premise.task || !memory) return [];

    return applySyllogisticRule(
      premise.task,
      memory,
      context,
      this.queryFn,
      this.constructFn,
      this.truthFn,
      this.excludeSelf
    );
  }
}

/**
 * Implements the deductive syllogism rule.
 * This rule derives (S --> P) from (S --> M) and (M --> P).
 */
export class DeductiveSyllogismRule extends SyllogisticRule {
  constructor(options = {}) {
    super('deductive_syllogism', 
      // Query for the second premise: (M --> P).
      // The key is M, which is the predicate of premise1 (S --> M).
      // We search for premises where M is the subject.
      (memory, _s1, p1) => memory.getInheritanceBySubject(p1),

      // Construct the conclusion: (S --> P).
      // S is the subject of premise1, P is the predicate of premise2.
      (s1, _p1, _s2, p2) => [s1, p2],

      // The truth function for deduction.
      (t1, t2) => t1.constructor.deduction(t1, t2),

      // It's valid for premise1 to be its own counterpart, so excludeSelf is false.
      false,
      options
    );
  }
}

/**
 * Implements the induction rule.
 * This rule derives (S --> P) from (M --> S) and (M --> P).
 */
export class InductionRule extends SyllogisticRule {
  constructor(options = {}) {
    super('induction',
      // Query for the second premise: (M --> P).
      // The key is M, which is the subject of premise1 (M --> S).
      // We search for premises where M is also the subject.
      (memory, s1, _p1) => memory.getInheritanceBySubject(s1),

      // Construct the conclusion: (S --> P).
      // S is the predicate of premise1, P is the predicate of premise2.
      (_s1, p1, _s2, p2) => [p1, p2],

      // The truth function for induction.
      (t1, t2) => t1.constructor.induction(t1, t2),

      // Induction requires two distinct premises.
      true,
      options
    );
  }
}

/**
 * Implements the abduction rule.
 * This rule derives (S --> P) from (S --> M) and (P --> M).
 */
export class AbductionRule extends SyllogisticRule {
  constructor(options = {}) {
    super('abduction',
      // Query for the second premise: (P --> M).
      // The key is M, which is the predicate of premise1 (S --> M).
      // We search for premises where M is the predicate.
      (memory, _s1, p1) => memory.getInheritanceByPredicate(p1),

      // Construct the conclusion: (S --> P).
      // S is the subject of premise1, P is the subject of premise2.
      (s1, _p1, s2, _p2) => [s1, s2],

      // The truth function for abduction.
      (t1, t2) => t1.constructor.abduction(t1, t2),

      // Abduction requires two distinct premises.
      true,
      options
    );
  }
}