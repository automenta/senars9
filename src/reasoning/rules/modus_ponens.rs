//! Implements the modus ponens inference rule.
//!
//! This rule derives `B` from `(A ==> B)` and `A`.

use crate::data_structures::{
    punctuation::Punctuation, task::Task, term_type::TermType, truth_value::TruthValue,
};
use crate::memory::Memory;
use crate::reasoning::inference_rule::InferenceRule;
use std::sync::Arc;

/// The ModusPonens rule struct.
pub struct ModusPonens;

impl InferenceRule for ModusPonens {
    /// This rule is triggered by an `Implication` term.
    fn get_trigger_term_type(&self) -> TermType {
        TermType::Implication
    }

    /// Applies the modus ponens rule.
    ///
    /// Given a premise `(A ==> B).` (an implication), it looks for a second premise `A.`
    /// (the antecedent as a belief) in memory to derive the conclusion `B.`.
    fn apply(&self, implication_task: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();

        if let (Some(antecedent), Some(consequent), Some(implication_truth)) = (
            &implication_task.term.subject,
            &implication_task.term.predicate,
            implication_task.truth,
        ) {
            // We have `(A ==> B)`. We need to check if `A.` exists in memory.
            if let Some(antecedent_task) = memory.get_task(&antecedent.hash) {
                if antecedent_task.is_belief() {
                    if let Some(antecedent_truth) = antecedent_task.truth {
                        // `A.` exists with a truth value. Derive `B.`.

                        // Calculate the truth value for the conclusion using the detachment function.
                        let new_truth = TruthValue::detachment(&antecedent_truth, &implication_truth);

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
}