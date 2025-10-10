pub mod inference_rule;
pub mod rule_engine;
pub mod rules;

use self::{
    rule_engine::RuleEngine,
    rules::{
        abduction::Abduction, analogy::Analogy, deductive_syllogism::DeductiveSyllogism,
        induction::Induction, modus_ponens::ModusPonens,
    },
};
use crate::cycle::context::CycleContext;
use crate::data_structures::task::Task;
use crate::memory::Memory;
use std::sync::Arc;

/// Represents the reasoning component of the SeNARS system.
///
/// The `Reasoner` uses a `RuleEngine` to apply inference rules to a given set of
/// tasks (the "focus set") to derive new knowledge. It is the central coordinator
/// for the reasoning process.
#[derive(Debug)]
pub struct Reasoner {
    rule_engine: RuleEngine,
}

impl Reasoner {
    /// Creates a new `Reasoner` and initializes its `RuleEngine`.
    ///
    /// This is where all the inference rules are registered with the `RuleEngine`.
    pub fn new() -> Self {
        let mut rule_engine = RuleEngine::new();

        // Register all inference rules.
        rule_engine.register(Box::new(DeductiveSyllogism));
        rule_engine.register(Box::new(ModusPonens));
        rule_engine.register(Box::new(Analogy));
        rule_engine.register(Box::new(Induction));
        rule_engine.register(Box::new(Abduction));

        Reasoner { rule_engine }
    }

    /// The main reasoning function.
    ///
    /// It iterates through a "focus set" of tasks. For each task, it queries the
    /// `RuleEngine` for applicable rules and applies them to derive new tasks.
    ///
    /// # Arguments
    /// * `focus_set` - A slice of `Arc<Task>` representing the tasks to reason about.
    /// * `memory` - A mutable reference to the system's `Memory`.
    /// * `context` - The context object for the current cycle.
    ///
    /// # Returns
    /// A `Vec<Task>` containing all newly derived tasks.
    pub fn reason(
        &self,
        focus_set: &[Arc<Task>],
        memory: &mut Memory,
        context: &CycleContext,
    ) -> Vec<Task> {
        let mut derived_tasks = Vec::new();

        for task in focus_set {
            // Find and apply all rules relevant to the current task.
            if let Some(applicable_rules) = self.rule_engine.get_applicable_rules(task) {
                for rule in applicable_rules {
                    derived_tasks.extend(rule.apply(task, memory, context));
                }
            }
        }

        derived_tasks
    }
}

impl Default for Reasoner {
    fn default() -> Self {
        Self::new()
    }
}


#[cfg(test)]
mod tests;