use crate::data_structures::{
    punctuation::Punctuation,
    task::Task,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};
use crate::memory::Memory;
use std::sync::Arc;

/// Represents the reasoning component of the SeNARS system.
///
/// The `Reasoner` is responsible for applying inference rules to a given set of tasks
/// (the "focus set") to derive new knowledge. It interacts with the `Memory` component
/// to fetch related knowledge needed for inference.
#[derive(Debug, Default)]
pub struct Reasoner;

impl Reasoner {
    /// Creates a new `Reasoner`.
    pub fn new() -> Self {
        Reasoner
    }

    /// The main reasoning function.
    ///
    /// It iterates through a "focus set" of tasks and attempts to apply relevant
    /// inference rules to each task, potentially deriving new tasks.
    ///
    /// # Arguments
    /// * `focus_set` - A slice of `Arc<Task>` representing the tasks to reason about.
    /// * `memory` - A reference to the system's `Memory` to look up related knowledge.
    ///
    /// # Returns
    /// A `Vec<Task>` containing all newly derived tasks.
    pub fn reason(&self, focus_set: &[Arc<Task>], memory: &mut Memory) -> Vec<Task> {
        let mut derived_tasks = Vec::new();

        for task in focus_set {
            // Attempt to apply different inference rules based on the task's term type.
            match task.term.term_type {
                TermType::Inheritance => {
                    derived_tasks.extend(self.deductive_syllogism(task, memory));
                }
                TermType::Implication => {
                    derived_tasks.extend(self.modus_ponens(task, memory));
                }
                TermType::Similarity => {
                    derived_tasks.extend(self.analogy(task, memory));
                }
                _ => {
                    // This is where other inference rule applications would go.
                }
            }
        }

        derived_tasks
    }

    /// Applies the deductive syllogism rule.
    ///
    /// Given a premise `(S --> M).`, it looks for a second premise `(M --> P).`
    /// in memory to derive the conclusion `(S --> P).`.
    fn deductive_syllogism(&self, premise1: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();
        if let (Some(subject1), Some(predicate1)) = (&premise1.term.subject, &premise1.term.predicate) {
            // Collect the predicates from the second premise to release the immutable borrow on memory.
            let second_premises_predicates: Vec<Arc<Term>> =
                if let Some(premises2) = memory.get_inheritance_by_subject(predicate1) {
                    premises2.iter().filter_map(|p| p.term.predicate.clone()).collect()
                } else {
                    Vec::new()
                };

            for predicate2 in second_premises_predicates {
                // Found (M --> P). Now derive (S --> P).
                let new_term = memory.create_or_get_compound_term(
                    TermType::Inheritance,
                    vec![Arc::clone(subject1), predicate2],
                );

                // TODO: Implement proper truth value calculation.
                let new_truth = TruthValue {
                    frequency: 1.0,
                    confidence: 0.81, // Simplified for now.
                };

                let new_task = Task::new(new_term, Punctuation::Belief, Some(new_truth));
                derived.push(new_task);
            }
        }
        derived
    }

    /// Applies the modus ponens rule.
    ///
    /// Given a premise `(A ==> B).` (an implication), it looks for a second premise `A.`
    /// (the antecedent as a belief) in memory to derive the conclusion `B.`.
    fn modus_ponens(&self, implication_task: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();
        if let Some(antecedent) = &implication_task.term.subject {
            // We have `(A ==> B)`. We need to check if `A.` exists in memory.
            if let Some(antecedent_task) = memory.get_task(&antecedent.hash) {
                if antecedent_task.is_belief() {
                    // `A.` exists. Derive `B.`.
                    if let Some(consequent) = &implication_task.term.predicate {
                        // TODO: Implement proper truth value calculation.
                        let new_truth = TruthValue {
                            frequency: 1.0,
                            confidence: 0.81, // Simplified for now.
                        };
                        let new_task = Task::new(
                            Arc::clone(consequent),
                            Punctuation::Belief,
                            Some(new_truth),
                        );
                        derived.push(new_task);
                    }
                }
            }
        }
        derived
    }
    /// Applies the analogy rule.
    ///
    /// Given a premise `(S <-> M).` and another premise `(S --> P).`, it derives
    /// a new question `(M --> P)?`. This rule generates questions based on similarity.
    fn analogy(&self, similarity_task: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();
        if let (Some(s), Some(m)) = (&similarity_task.term.subject, &similarity_task.term.predicate) {
            // Case 1: Find properties of S to ask about M.
            let properties_of_s_preds: Vec<Arc<Term>> =
                if let Some(properties_of_s) = memory.get_inheritance_by_subject(s) {
                    properties_of_s.iter().filter_map(|t| t.term.predicate.clone()).collect()
                } else {
                    Vec::new()
                };

            for p in properties_of_s_preds {
                // Found (S --> P), derive (M --> P)?
                let new_term = memory.create_or_get_compound_term(TermType::Inheritance, vec![Arc::clone(m), p]);
                let new_question = Task::new(new_term, Punctuation::Question, None);
                derived.push(new_question);
            }

            // Case 2: Find properties of M to ask about S.
            let properties_of_m_preds: Vec<Arc<Term>> =
                if let Some(properties_of_m) = memory.get_inheritance_by_subject(m) {
                    properties_of_m.iter().filter_map(|t| t.term.predicate.clone()).collect()
                } else {
                    Vec::new()
                };

            for p in properties_of_m_preds {
                // Found (M --> P), derive (S --> P)?
                let new_term = memory.create_or_get_compound_term(TermType::Inheritance, vec![Arc::clone(s), p]);
                let new_question = Task::new(new_term, Punctuation::Question, None);
                derived.push(new_question);
            }
        }
        derived
    }
}

#[cfg(test)]
mod tests;