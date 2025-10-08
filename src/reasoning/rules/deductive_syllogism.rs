//! Implements the deductive syllogism rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(M --> P)`.

use super::helpers;
use crate::cycle::context::CycleContext;
use crate::data_structures::{task::Task, term_type::TermType, truth_value::TruthValue};
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
        helpers::apply_syllogistic_rule(
            premise1,
            memory,
            context,
            // Query for the second premise: `(M --> P)`.
            // The key is `M`, which is the predicate of `premise1` (`S --> M`).
            // We search for premises where `M` is the subject.
            |mem, _s1, p1| {
                mem.get_inheritance_by_subject(p1).map(|v| {
                    // The memory function returns a reference to a vector of references.
                    // We need to iterate, dereference, and clone to get an owned Vec<Arc<Task>>.
                    v.iter().map(|task_ref| (*task_ref).clone()).collect()
                })
            },
            // Construct the conclusion: `(S --> P)`.
            // `S` is the subject of `premise1`, `P` is the predicate of `premise2`.
            |s1, _p1, _s2, p2| (s1.clone(), p2.clone()),
            // The truth function for deduction.
            TruthValue::deduction,
            // It's valid for `premise1` to be its own counterpart (e.g., deriving
            // `(S --> S)` from `(S --> M)` and `(M --> S)`), so `exclude_self` is false.
            false,
        )
    }
}