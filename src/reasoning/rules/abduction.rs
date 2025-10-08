//! Implements the abduction rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(P --> M)`.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    concept::Concept, punctuation::Punctuation, task::Task, term_type::TermType,
    truth_value::TruthValue,
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
            // We have (S --> M). We need to find premises (P --> M).
            // The predicate of the second premise must be the same as the first.

            let premises2_data: Vec<(Arc<Concept>, TruthValue)> = if let Some(
                premises2,
            ) = memory.get_inheritance_by_predicate(predicate1_term)
            {
                premises2
                    .iter()
                    // Exclude the premise task itself from being the second premise.
                    .filter(|p| p.term().hash != premise1.term().hash)
                    .filter_map(|p| {
                        if let (Some(subj_term), Some(truth)) = (&p.term().subject, p.truth) {
                            let subj_concept = memory.concept_storage.get(&subj_term.hash)?;
                            Some((subj_concept.clone(), truth))
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

            for (subject2_concept, truth2) in premises2_data {
                // Found (P --> M). Now derive (S --> P).
                let new_concept = memory.create_or_get_compound_term(
                    TermType::Inheritance,
                    vec![subject1_concept.clone(), subject2_concept],
                    context.current_time,
                );

                let new_truth = TruthValue::abduction(&truth1, &truth2);

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