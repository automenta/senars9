import { InferenceRule } from '../Reasoner.js';
import { Term, TermType } from '../Term.js';
import { Task, Punctuation } from '../Task.js';

/**
 * Implements the analogy inference rule.
 * This rule generates questions based on similarity. For example, from
 * (S <-> M) and (S --> P), it derives (M --> P)?.
 */
export class Analogy extends InferenceRule {
  /**
   * This rule is triggered by a Similarity term.
   */
  getTriggerTermType() {
    return TermType.SIMILARITY;
  }

  /**
   * Applies the analogy rule.
   * 
   * Given a premise (S <-> M). and another premise (S --> P)., it derives
   * a new question (M --> P)?. This rule generates questions based on similarity.
   * It works symmetrically, also deriving (S --> P)? from (M --> P)?.
   * 
   * @param {Task} similarityTask - The similarity task (S <-> M)
   * @param {Memory} memory - Reference to the system's memory
   * @param {CycleContext} context - The current cycle's context
   * @returns {Task[]} Array of derived tasks
   */
  apply(similarityTask, memory, context) {
    const derived = [];

    if (similarityTask.term.subject && similarityTask.term.predicate) {
      const sTerm = similarityTask.term.subject;
      const mTerm = similarityTask.term.predicate;

      // This helper function encapsulates the logic for one direction of the analogy.
      const deriveQuestions = (term1, term2) => {
        const questions = [];

        // Find all terms P such that (term1 --> P) exists.
        const properties = memory.getInheritanceBySubject(term1);
        if (properties) {
          const propertyTerms = properties
            .filter(task => task.term.predicate)
            .map(task => task.term.predicate);

          // For each found property P, create the question (term2 --> P)?
          for (const pTerm of propertyTerms) {
            // Found (term1 --> P), derive (term2 --> P)?
            const newTerm = Term.createCompound(TermType.INHERITANCE, [term2, pTerm]);
            const newQuestion = new Task(
              newTerm,
              Punctuation.QUESTION,
              null, // Questions don't have truth values
              context.currentTime,
              context.currentTime
            );
            questions.push(newQuestion);
          }
        }
        return questions;
      };

      // Case 1: Find properties of S to ask about M. (S --> P) => (M --> P)?
      derived.push(...deriveQuestions(sTerm, mTerm));

      // Case 2: Find properties of M to ask about S. (M --> P) => (S --> P)?
      derived.push(...deriveQuestions(mTerm, sTerm));
    }
    
    return derived;
  }
}