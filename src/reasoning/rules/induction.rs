//! Implements the induction rule.
//!
//! This rule derives `(S --> P)` from `(M --> S)` and `(M --> P)`.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    concept::Concept, punctuation::Punctuation, task::Task, term_type::TermType,
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

            let premises2_data: Vec<(Arc<Concept>, TruthValue)> =
                if let Some(premises2) = memory.get_inheritance_by_subject(subject1_term) {
                    premises2
                        .iter()
                        // Exclude the premise task itself from being the second premise.
                        .filter(|p| p.term().hash != premise1.term().hash)
                        .filter_map(|p| {
                            if let (Some(pred_term), Some(truth)) = (&p.term().predicate, p.truth) {
                                let pred_concept = memory.concept_storage.get(&pred_term.hash)?;
                                Some((pred_concept.clone(), truth))
                            } else {
                                None
                            }
                        })
                        .collect()
                } else {
                    Vec::new()
                };

            if premises2_data.is_empty() {
                return derived;
            }

            let predicate1_concept = match memory.concept_storage.get(&predicate1_term.hash) {
                Some(c) => c.clone(),
                None => return derived,
            };

            for (predicate2_concept, truth2) in premises2_data {
                // Found (M --> P). Now derive (S --> P).
                let new_concept = memory.create_or_get_compound_term(
                    TermType::Inheritance,
                    vec![predicate1_concept.clone(), predicate2_concept],
                    context.current_time,
                );

                let new_truth = TruthValue::induction(&truth1, &truth2);

                let new_task = Task::new(
                    new_concept,
                    Punctuation::Belief,
                    Some(new_truth),
                    context.current_time,
                    context.current_time,
                );
                derived.push(new_task);
            }
        }
        derived
    }
}