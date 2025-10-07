use std::collections::HashMap;
use crate::data_structures::task::Task;

/// Represents the memory of the SeNARS system.
#[derive(Debug, Default)]
pub struct Memory {
    /// A map of tasks, keyed by the name of the task's term.
    tasks: HashMap<String, Task>,
}

impl Memory {
    /// Creates a new, empty Memory component.
    pub fn new() -> Self {
        Memory {
            tasks: HashMap::new(),
        }
    }

    /// Adds a task to memory. If a task with the same term name already exists, it is overwritten.
    pub fn add_task(&mut self, task: Task) {
        self.tasks.insert(task.term.name.clone(), task);
    }

    /// Retrieves a task from memory by its term name.
    pub fn get_task(&self, term_name: &str) -> Option<&Task> {
        self.tasks.get(term_name)
    }

    /// Returns an iterator over all tasks in memory.
    pub fn get_all_tasks_iter(&self) -> impl Iterator<Item = &Task> {
        self.tasks.values()
    }
}

#[cfg(test)]
mod tests;