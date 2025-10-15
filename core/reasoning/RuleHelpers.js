import { NALRule } from './Rule.js';
import { TermType } from '../Term.js';

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
    const premises2 = queryPremises2(memory, s1, p1);
    if (!premises2) return derived;

    for (const premise2 of premises2) {
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

        // In NARS, the truth value of a conclusion from two premises needs to be calculated
        // using the appropriate inference rule truth calculation function
        const newTruth = calculateNewTruth(truth1, truth2);

        // Create the new derived task
        const newTerm = {
          name: `(${newSubject.name} --> ${newPredicate.name})`,
          termType: TermType.INHERITANCE,
          subject: newSubject,
          predicate: newPredicate,
          hash: `impl_${newSubject.hash}_${newPredicate.hash}`,
          components: [newSubject, newPredicate],
          complexity: newSubject.complexity + newPredicate.complexity + 1
        };

        // Note: In a real implementation, we'd want to properly create terms using the Term class
        // For now, we'll create a basic task structure with proper inheritance relation
        derived.push({
          term: newTerm,
          punctuation: premise1.punctuation, // Keep the same punctuation type
          truth: newTruth,
          getPriority: () => 0.5, // Default priority
          setPriority: () => {},
          getAccessedAt: () => Date.now(),
          setAccessedAt: () => {},
          createdAt: Date.now(),
          occurrenceTime: Date.now(),
          isBelief: () => true,
          isQuestion: () => false,
          isGoal: () => false,
          isExpired: () => false
        });
      }
    }
  }
  return derived;
}

/**
 * Creates a standardized syllogistic rule.
 *
 * @param {string} id - Unique identifier for the rule
 * @param {Function} queryFn - Function for querying the second premise
 * @param {Function} constructFn - Function for constructing the conclusion's term
 * @param {Function} truthFn - The truth function to be used (e.g., TruthValue.deduction)
 * @param {boolean} excludeSelf - Whether premise1 can also be premise2
 * @param {object} options - Additional rule options
 * @returns {NALRule} A new syllogistic rule instance
 */
export function createSyllogisticRule(id, queryFn, constructFn, truthFn, excludeSelf, options = {}) {
  return class SyllogisticRule extends NALRule {
    constructor(options = {}) {
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
  };
}