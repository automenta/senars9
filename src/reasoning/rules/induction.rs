//! Implements the induction rule.
//!
//! This rule derives `(S --> P)` from `(M --> S)` and `(M --> P)`.

use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType, truth_value::TruthValue,
};
use crate::memory::Memory;
use crate::reasoning::inference_rule::InferenceRule;
use std::sync::Arc;

/// The Induction rule struct.
pub struct Induction;

impl InferenceRule for Induction {
    /// This rule is triggered by an `Inheritance` term.
    fn get_trigger_term_type(&self) -> TermType {
        TermType::Inheritance
    }

    /// Applies the induction rule.
    ///
    /// Given a premise `(M --> S).` (premise1), it looks for a second premise
    /// `(M --> P).` in memory to derive the conclusion `(S --> P).`.
    fn apply(&self, premise1: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();

        if let (Some(subject1), Some(predicate1), Some(truth1)) = (
            &premise1.term.subject,
            &premise1.term.predicate,
            premise1.truth,
        ) {
            // We have (M --> S). We need to find premises (M --> P).
            // The subject of the second premise must be the same as the first.

            // Collect the required data from the second premises to avoid borrow checker issues.
            let premises2_data: Vec<(Arc<Term>, TruthValue)> =
                if let Some(premises2) = memory.get_inheritance_by_subject(subject1) {
                    premises2
                        .iter()
                        // Exclude the premise task itself from being the second premise.
                        .filter(|p| p.term.hash != premise1.term.hash)
                        .filter_map(|p| {
                            if let (Some(pred), Some(truth)) = (&p.term.predicate, p.truth) {
                                Some((Arc::clone(pred), truth))
                            } else {
                                None
                            }
                        })
                        .collect()
                } else {
                    Vec::new()
                };

            // Now, iterate over the collected data to derive conclusions.
            for (predicate2, truth2) in premises2_data {
                // Found (M --> P). Now derive (S --> P).
                let new_term = memory.create_or_get_compound_term(
                    TermType::Inheritance,
                    vec![Arc::clone(predicate1), predicate2],
                );

                // Calculate the truth value for the conclusion using the induction function.
                let new_truth = TruthValue::induction(&truth1, &truth2);

                let new_task = Task::new(new_term, Punctuation::Belief, Some(new_truth));
                derived.push(new_task);
            }
        }
        derived
    }
}