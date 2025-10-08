//! Implements the abduction rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(P --> M)`.

use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType, truth_value::TruthValue,
};
use crate::memory::Memory;
use crate::reasoning::inference_rule::InferenceRule;
use std::sync::Arc;

/// The Abduction rule struct.
pub struct Abduction;

impl InferenceRule for Abduction {
    /// This rule is triggered by an `Inheritance` term.
    fn get_trigger_term_type(&self) -> TermType {
        TermType::Inheritance
    }

    /// Applies the abduction rule.
    ///
    /// Given a premise `(S --> M).` (premise1), it looks for a second premise
    /// `(P --> M).` in memory to derive the conclusion `(S --> P).`.
    fn apply(&self, premise1: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();

        if let (Some(subject1), Some(predicate1), Some(truth1)) = (
            &premise1.term.subject,
            &premise1.term.predicate,
            premise1.truth,
        ) {
            // We have (S --> M). We need to find premises (P --> M).
            // The predicate of the second premise must be the same as the first.

            // Collect the required data from the second premises to avoid borrow checker issues.
            let premises2_data: Vec<(Arc<Term>, TruthValue)> = if let Some(
                premises2,
            ) = memory.get_inheritance_by_predicate(predicate1)
            {
                premises2
                    .iter()
                    // Exclude the premise task itself from being the second premise.
                    .filter(|p| p.term.hash != premise1.term.hash)
                    .filter_map(|p| {
                        if let (Some(subj), Some(truth)) = (&p.term.subject, p.truth) {
                            Some((Arc::clone(subj), truth))
                        } else {
                            None
                        }
                    })
                    .collect()
            } else {
                Vec::new()
            };

            // Now, iterate over the collected data to derive conclusions.
            for (subject2, truth2) in premises2_data {
                // Found (P --> M). Now derive (S --> P).
                let new_term = memory.create_or_get_compound_term(
                    TermType::Inheritance,
                    vec![Arc::clone(subject1), subject2],
                );

                // Calculate the truth value for the conclusion using the abduction function.
                let new_truth = TruthValue::abduction(&truth1, &truth2);

                let new_task = Task::new(new_term, Punctuation::Belief, Some(new_truth));
                derived.push(new_task);
            }
        }
        derived
    }
}