pub mod clock;
pub mod context;

use self::context::CycleContext;
use crate::data_structures::task::Task;
use crate::memory::Memory;
use crate::reasoning::Reasoner;
use std::sync::Arc;

// Defines the number of tasks to select for the focus set in each cycle.
const FOCUS_SET_SIZE: usize = 5;

/// Runs a single, complete cognitive cycle.
///
/// This is a stateless function that orchestrates the main reasoning loop.
///
/// The process involves:
/// 1. Selecting a "focus set" of high-priority tasks from memory.
/// 2. Passing the focus set to the reasoner to derive new tasks (conclusions).
/// 3. Adding the newly derived tasks back into memory.
/// 4. Performing memory consolidation to manage knowledge.
///
/// # Arguments
/// * `memory` - A mutable reference to the system's `Memory`.
/// * `reasoner` - A reference to the system's `Reasoner`.
/// * `context` - The context object for the current cycle, containing the timestamp.
pub fn run_single_cycle(memory: &mut Memory, reasoner: &Reasoner, context: &CycleContext) {
    // 1. Select focus set
    let focus_set = select_focus_set(memory);
    if focus_set.is_empty() {
        return; // Nothing to do if memory is empty.
    }

    // 2. Reason on the focus set to derive new knowledge
    let derived_tasks = reasoner.reason(&focus_set, memory, context);

    // 3. Add derived tasks back to memory
    for task in derived_tasks {
        memory.add_task(task);
    }

    // 4. Consolidate memory
    memory.consolidate(context.current_time);
}

/// Selects a set of tasks to focus on for the current cycle.
///
/// This is a simplified implementation that prioritizes tasks based on their priority value.
fn select_focus_set(memory: &Memory) -> Vec<Arc<Task>> {
    let mut all_tasks: Vec<Arc<Task>> = memory.get_all_tasks_iter().cloned().collect();
    // Sort tasks by priority in descending order.
    all_tasks.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap());
    // Take the top `FOCUS_SET_SIZE` tasks.
    all_tasks.into_iter().take(FOCUS_SET_SIZE).collect()
}


#[cfg(test)]
mod tests;