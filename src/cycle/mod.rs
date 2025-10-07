use crate::data_structures::task::Task;
use crate::memory::Memory;
use crate::reasoning::Reasoner;
use std::sync::Arc;

// Defines the number of tasks to select for the focus set in each cycle.
const FOCUS_SET_SIZE: usize = 5;

/// Represents the core cognitive cycle of the SeNARS system.
///
/// The `Cycle` orchestrates the entire reasoning process. It selects tasks from memory,
/// sends them to the reasoner, and then integrates the derived knowledge back into memory.
#[derive(Debug)]
pub struct Cycle<'a> {
    /// A mutable reference to the system's memory, allowing the cycle to add new knowledge.
    memory: &'a mut Memory,
    /// A reference to the reasoner component.
    reasoner: &'a Reasoner,
}

impl<'a> Cycle<'a> {
    /// Creates a new `Cycle` component.
    ///
    /// # Arguments
    /// * `memory` - A mutable reference to the system's `Memory`.
    /// * `reasoner` - A reference to the system's `Reasoner`.
    pub fn new(memory: &'a mut Memory, reasoner: &'a Reasoner) -> Self {
        Cycle { memory, reasoner }
    }

    /// Selects a set of tasks to focus on for the current cycle.
    ///
    /// This is a simplified implementation that prioritizes tasks based on their priority value.
    /// A more advanced implementation would consider recency, relevance, and other factors.
    pub fn select_focus_set(&self) -> Vec<Arc<Task>> {
        let mut all_tasks: Vec<Arc<Task>> = self.memory.get_all_tasks_iter().cloned().collect();
        // Sort tasks by priority in descending order.
        all_tasks.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap());
        // Take the top `FOCUS_SET_SIZE` tasks.
        all_tasks.into_iter().take(FOCUS_SET_SIZE).collect()
    }

    /// Runs a single, complete cognitive cycle.
    ///
    /// The process involves:
    /// 1. Selecting a "focus set" of high-priority tasks from memory.
    /// 2. Passing the focus set to the reasoner to derive new tasks (conclusions).
    /// 3. Adding the newly derived tasks back into memory.
    pub fn run_cycle(&mut self) {
        // 1. Select focus set
        let focus_set = self.select_focus_set();
        if focus_set.is_empty() {
            return; // Nothing to do if memory is empty.
        }

        // 2. Reason on the focus set to derive new knowledge
        let derived_tasks = self.reasoner.reason(&focus_set, self.memory);

        // 3. Add derived tasks back to memory
        for task in derived_tasks {
            self.memory.add_task(task);
        }
    }
}

#[cfg(test)]
mod tests;