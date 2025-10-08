//! This module defines the `RuleEngine`, which manages and applies inference rules.

use super::inference_rule::InferenceRule;
use crate::data_structures::{task::Task, term_type::TermType};
use std::collections::HashMap;
use std::fmt;
use std::sync::Arc;

/// The `RuleEngine` is responsible for storing, indexing, and applying inference rules.
///
/// It uses a "winnowing" approach by indexing rules based on the `TermType` that
/// triggers them. This allows the `Reasoner` to quickly select only the relevant
/// rules for a given task, avoiding unnecessary checks and improving performance.
#[derive(Default)]
pub struct RuleEngine {
    /// A map from a `TermType` to a vector of rules that are triggered by it.
    /// This is the core of the winnowing mechanism.
    rules: HashMap<TermType, Vec<Box<dyn InferenceRule>>>,
}

impl RuleEngine {
    /// Creates a new, empty `RuleEngine`.
    pub fn new() -> Self {
        RuleEngine {
            rules: HashMap::new(),
        }
    }

    /// Registers a new inference rule with the engine.
    ///
    /// The rule is indexed by its trigger `TermType`, allowing for efficient lookup.
    ///
    /// # Arguments
    /// * `rule` - A `Box<dyn InferenceRule>` containing the rule to be registered.
    pub fn register(&mut self, rule: Box<dyn InferenceRule>) {
        let trigger_type = rule.get_trigger_term_type();
        self.rules.entry(trigger_type).or_default().push(rule);
    }

    /// Retrieves all rules that are applicable to a given task.
    ///
    /// It looks up rules based on the `TermType` of the task's term.
    ///
    /// # Arguments
    /// * `task` - The task for which to find applicable rules.
    ///
    /// # Returns
    /// An `Option<&Vec<Box<dyn InferenceRule>>>` containing the slice of applicable
    /// rules if any are found.
    pub fn get_applicable_rules(&self, task: &Arc<Task>) -> Option<&Vec<Box<dyn InferenceRule>>> {
        self.rules.get(&task.term().term_type)
    }
}

impl fmt::Debug for RuleEngine {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let rule_count = self.rules.values().map(|v| v.len()).sum::<usize>();
        f.debug_struct("RuleEngine")
            .field("indexed_term_types", &self.rules.keys())
            .field("total_rules", &rule_count)
            .finish()
    }
}