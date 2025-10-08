//! Implements the deductive syllogism rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(M --> P)`.

//! Implements the deductive syllogism rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(M --> P)`.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType,
    truth_value::TruthValue,
};
use crate::memory::Memory;
use crate::reasoning::inference_rule::InferenceRule;
use std::sync::Arc;

/// The DeductiveSyllogism rule struct.
pub struct DeductiveSyllogism;

impl InferenceRule for DeductiveSyllogism {
    /// This rule is triggered by an `Inheritance` term.
    fn get_trigger_term_type(&self) -> TermType {
        TermType::Inheritance
    }

    /// Applies the deductive syllogism rule.
    ///
    /// Given a premise `(S --> M).`, it looks for a second premise `(M --> P).`
    /// in memory to derive the conclusion `(S --> P).`.
    fn apply(&self, premise1: &Arc<Task>, memory: &mut Memory, context: &CycleContext) -> Vec<Task> {
        let mut derived = Vec::new();

        if let (Some(subject1_term), Some(predicate1_term), Some(truth1)) = (
            &premise1.term().subject,
            &premise1.term().predicate,
            premise1.truth,
        ) {
            // We have (S --> M). We need to find premises (M --> P).
            // The subject of the second premise must be the predicate of the first.
            let premises2 = match memory.get_inheritance_by_subject(predicate1_term) {
                Some(tasks) => tasks,
                None => return derived,
            };

            for premise2 in premises2 {
                if let (Some(predicate2_term), Some(truth2)) = (&premise2.term().predicate, premise2.truth) {
                    // Found (M --> P). Now derive (S --> P).
                    let new_term = Term::create_compound(
                        TermType::Inheritance,
                        vec![subject1_term.clone(), predicate2_term.clone()],
                    );

                    let new_truth = TruthValue::deduction(&truth1, &truth2);

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