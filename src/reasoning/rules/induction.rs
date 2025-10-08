//! Implements the induction rule.
//!
//! This rule derives `(S --> P)` from `(M --> S)` and `(M --> P)`.

//! Implements the induction rule.
//!
//! This rule derives `(S --> P)` from `(M --> S)` and `(M --> P)`.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType,
    truth_value::TruthValue,
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
    fn apply(&self, premise1: &Arc<Task>, memory: &mut Memory, context: &CycleContext) -> Vec<Task> {
        let mut derived = Vec::new();

        if let (Some(subject1_term), Some(predicate1_term), Some(truth1)) = (
            &premise1.term().subject,
            &premise1.term().predicate,
            premise1.truth,
        ) {
            // We have (M --> S). We need to find premises (M --> P).
            // The subject of the second premise must be the same as the first.
            let premises2 = match memory.get_inheritance_by_subject(subject1_term) {
                Some(tasks) => tasks,
                None => return derived,
            };

            for premise2 in premises2 {
                // Exclude the premise task itself from being the second premise.
                if premise2.term().hash == premise1.term().hash {
                    continue;
                }

                if let (Some(predicate2_term), Some(truth2)) = (&premise2.term().predicate, premise2.truth) {
                    // Found (M --> P). Now derive (S --> P).
                    let new_term = Term::create_compound(
                        TermType::Inheritance,
                        vec![predicate1_term.clone(), predicate2_term.clone()],
                    );

                    let new_truth = TruthValue::induction(&truth1, &truth2);

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