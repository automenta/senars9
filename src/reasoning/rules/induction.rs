//! Implements the induction rule.
//!
//! This rule derives `(S --> P)` from `(M --> S)` and `(M --> P)`.

use super::helpers;
use crate::cycle::context::CycleContext;
use crate::data_structures::{task::Task, term_type::TermType, truth_value::TruthValue};
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
        helpers::apply_syllogistic_rule(
            premise1,
            memory,
            context,
            // Query for the second premise: `(M --> P)`.
            // The key is `M`, which is the subject of `premise1` (`M --> S`).
            // We search for premises where `M` is the subject.
            |mem, s1, _p1| {
                mem.get_inheritance_by_subject(s1).map(|v| {
                    // The memory function returns a reference to a vector of references.
                    // We need to iterate, dereference, and clone to get an owned Vec<Arc<Task>>.
                    v.iter().map(|task_ref| (*task_ref).clone()).collect()
                })
            },
            // Construct the conclusion: `(S --> P)`.
            // `S` is the predicate of `premise1`, `P` is the predicate of `premise2`.
            |_s1, p1, _s2, p2| (p1.clone(), p2.clone()),
            // The truth function for induction.
            TruthValue::induction,
            // Induction requires two distinct premises, so `premise1` cannot be
            // used as `premise2`.
            true,
        )
    }
}