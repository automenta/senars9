//! Implements the deductive syllogism rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(M --> P)`.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    concept::Concept, punctuation::Punctuation, task::Task, term_type::TermType,
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

            let premises2_data: Vec<(Arc<Concept>, TruthValue)> =
                if let Some(premises2) = memory.get_inheritance_by_subject(predicate1_term) {
                    premises2
                        .iter()
                        .filter_map(|p| {
                            if let (Some(predicate2_term), Some(truth)) = (&p.term().predicate, p.truth) {
                                let predicate2_concept = memory.concept_storage.get(&predicate2_term.hash)?;
                                Some((predicate2_concept.clone(), truth))
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

            let subject1_concept = match memory.concept_storage.get(&subject1_term.hash) {
                Some(c) => c.clone(),
                None => return derived,
            };

            for (predicate2_concept, truth2) in premises2_data {
                let new_concept = memory.create_or_get_compound_term(
                    TermType::Inheritance,
                    vec![subject1_concept.clone(), predicate2_concept],
                    context.current_time,
                );

                let new_truth = TruthValue::deduction(&truth1, &truth2);

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