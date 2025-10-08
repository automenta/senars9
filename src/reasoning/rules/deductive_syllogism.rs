//! Implements the deductive syllogism rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(M --> P)`.

use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType, truth_value::TruthValue,
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
    fn apply(&self, premise1: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();
        if let (Some(subject1), Some(predicate1)) = (&premise1.term.subject, &premise1.term.predicate)
        {
            // We have (S --> M). We need to find (M --> P).
            // The subject of the second premise must be the predicate of the first.
            let second_premises_predicates: Vec<Arc<Term>> =
                if let Some(premises2) = memory.get_inheritance_by_subject(predicate1) {
                    premises2
                        .iter()
                        .filter_map(|p| p.term.predicate.clone())
                        .collect()
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
}