use crate::memory::Memory;
use crate::reasoning::Reasoner;
use crate::data_structures::task::Task;

const FOCUS_SET_SIZE: usize = 5;

/// Represents the core cognitive cycle of the SeNARS system.
#[derive(Debug)]
pub struct Cycle<'a> {
    /// A reference to the system's memory.
    memory: &'a Memory,
    /// The reasoner component.
    reasoner: &'a Reasoner,
}

impl<'a> Cycle<'a> {
    /// Creates a new Cycle component.
    pub fn new(memory: &'a Memory, reasoner: &'a Reasoner) -> Self {
        Cycle { memory, reasoner }
    }

    /// Selects a set of tasks to focus on for the current cycle.
    ///
    /// This is a simplified implementation that just takes the first `FOCUS_SET_SIZE` tasks.
    /// A future implementation will use a more sophisticated priority-based selection algorithm.
    pub fn select_focus_set(&self) -> Vec<&Task> {
        self.memory.get_all_tasks_iter().take(FOCUS_SET_SIZE).collect()
    }

    /// Runs a single cognitive cycle.
    pub fn run_cycle(&self) {
        println!("--- Running Cognitive Cycle ---");
        let focus_set = self.select_focus_set();
        println!("Focus Set ({} tasks):", focus_set.len());
        for task in &focus_set {
            println!("  - {}", task.term.name);
        }

        let derived_tasks = self.reasoner.reason(&focus_set);
        if !derived_tasks.is_empty() {
            println!("Derived Tasks ({}):", derived_tasks.len());
            for task in derived_tasks {
                println!("  - Derived: {}", task.term.name);
            }
        }

        println!("--- Cycle Complete ---");
    }
}

#[cfg(test)]
mod tests;