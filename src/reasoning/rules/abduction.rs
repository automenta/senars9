//! Implements the abduction rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(P --> M)`.

use super::helpers;
use crate::cycle::context::CycleContext;
use crate::data_structures::{task::Task, term_type::TermType, truth_value::TruthValue};
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
        helpers::apply_syllogistic_rule(
            premise1,
            memory,
            context,
            // Query for the second premise: `(P --> M)`.
            // The key is `M`, which is the predicate of `premise1` (`S --> M`).
            // We search for premises where `M` is the predicate.
            |mem, _s1, p1| {
                mem.get_inheritance_by_predicate(p1).map(|v| {
                    // The memory function returns a reference to a vector of references.
                    // We need to iterate, dereference, and clone to get an owned Vec<Arc<Task>>.
                    v.iter().map(|task_ref| (*task_ref).clone()).collect()
                })
            },
            // Construct the conclusion: `(S --> P)`.
            // `S` is the subject of `premise1`, `P` is the subject of `premise2`.
            |s1, _p1, s2, _p2| (s1.clone(), s2.clone()),
            // The truth function for abduction.
            TruthValue::abduction,
            // Abduction requires two distinct premises.
            true,
        )
    }
}