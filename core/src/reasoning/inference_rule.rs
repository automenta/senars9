//! This module defines the `InferenceRule` trait, which provides a common
//! interface for all inference rules in the system.

use crate::cycle::context::CycleContext;
use crate::data_structures::{task::Task, term_type::TermType};
use crate::memory::Memory;
use std::sync::Arc;

/// A trait for a SeNARS inference rule.
///
/// Each rule is designed to be triggered by a specific `TermType`, allowing for
/// efficient, targeted application of logic. This is the core of the 'winnowing'
/// approach to rule execution.
pub trait InferenceRule: Send + Sync {
    /// Returns the `TermType` that this rule is designed to be triggered by.
    /// This is used by the `RuleEngine` to index and retrieve rules efficiently.
    fn get_trigger_term_type(&self) -> TermType;

    /// Applies the inference rule to a given task.
    ///
    /// # Arguments
    /// * `task` - The task that has triggered the rule.
    /// * `memory` - A mutable reference to the system's memory, allowing the rule
    ///   to look up related knowledge and create new terms.
    /// * `context` - The context for the current reasoning cycle.
    ///
    /// # Returns
    /// A `Vec<Task>` containing any newly derived tasks. If no tasks are derived,
    /// an empty vector is returned.
    fn apply(&self, task: &Arc<Task>, memory: &mut Memory, context: &CycleContext) -> Vec<Task>;
}