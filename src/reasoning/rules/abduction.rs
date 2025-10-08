//! Implements the abduction rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(P --> M)`.

//! Implements the abduction rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(P --> M)`.

use crate::cycle::context::CycleContext;
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
    fn apply(&self, premise1: &Arc<Task>, memory: &mut Memory, context: &CycleContext) -> Vec<Task> {
        let mut derived = Vec::new();

        if let (Some(subject1_term), Some(predicate1_term), Some(truth1)) = (
            &premise1.term().subject,
            &premise1.term().predicate,
            premise1.truth,
        ) {
            // We have (S --> M). We need to find premises of the form (P --> M).
            // The predicate of the second premise must be the same as the first.
            let premises2 = match memory.get_inheritance_by_predicate(predicate1_term) {
                Some(tasks) => tasks,
                None => return derived,
            };

            for premise2 in premises2 {
                // Exclude the premise task itself from being the second premise.
                if premise2.term().hash == premise1.term().hash {
                    continue;
                }

                if let (Some(subject2_term), Some(truth2)) = (&premise2.term().subject, premise2.truth) {
                    // Found (P --> M). Now derive (S --> P).
                    let new_term = Term::create_compound(
                        TermType::Inheritance,
                        vec![subject1_term.clone(), subject2_term.clone()],
                    );

                    let new_truth = TruthValue::abduction(&truth1, &truth2);

                    let new_task = Task::new(
                        new_term,
                        Punctuation::Belief,
                        Some(new_truth),
                        context.current_time,
                        context.current_time,
                    );
                    derived.push(new_task);
                }
            }
        }
        derived
    }
}