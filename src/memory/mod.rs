use crate::data_structures::{task::Task, term::Term, term_type::TermType};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

/// Represents the memory of the SeNARS system, storing knowledge and active tasks.
///
/// The memory is designed for efficient retrieval of information based on term structure,
/// which is crucial for the reasoning process. It uses a content-addressable storage
/// approach where terms are identified by their unique hash.
#[derive(Debug, Default)]
pub struct Memory {
    /// The main storage for all tasks, keyed by the hash of the task's term.
    /// Using `Arc<Task>` allows for cheap cloning of tasks for processing.
    tasks: HashMap<String, Arc<Task>>,

    /// An index to quickly find implications that can be triggered by a given premise.
    /// Maps the hash of a premise term to a set of task hashes (implications).
    implication_index: HashMap<String, HashSet<String>>,

    /// An index for efficient lookup of inheritance relationships.
    /// Maps the hash of a subject term to a set of task hashes (inheritance statements).
    inheritance_index: HashMap<String, HashSet<String>>,
    // Add other indexes (similarity, equivalence, etc.) here as needed.
}

impl Memory {
    /// Creates a new, empty `Memory` component.
    pub fn new() -> Self {
        Memory {
            tasks: HashMap::new(),
            implication_index: HashMap::new(),
            inheritance_index: HashMap::new(),
        }
    }

    /// Adds a task to memory and updates the relevant indexes.
    ///
    /// If a task with the same term hash already exists, it is overwritten.
    /// The method analyzes the task's term to determine which indexes to update.
    pub fn add_task(&mut self, task: Task) {
        let task_arc = Arc::new(task);
        let term_hash = task_arc.term.hash.clone();

        // Add to the main task store.
        self.tasks.insert(term_hash.clone(), task_arc.clone());

        // Update indexes based on the term type.
        match task_arc.term.term_type {
            TermType::Implication => {
                if let Some(premise) = &task_arc.term.subject {
                    self.implication_index
                        .entry(premise.hash.clone())
                        .or_default()
                        .insert(term_hash);
                }
            }
            TermType::Inheritance => {
                if let Some(subject) = &task_arc.term.subject {
                    self.inheritance_index
                        .entry(subject.hash.clone())
                        .or_default()
                        .insert(term_hash);
                }
            }
            // Add cases for other indexed types here.
            _ => {}
        }
    }

    /// Retrieves a task from memory by the hash of its term.
    pub fn get_task(&self, term_hash: &str) -> Option<&Arc<Task>> {
        self.tasks.get(term_hash)
    }

    /// Retrieves all implication tasks where the given term is the premise.
    ///
    /// # Arguments
    /// * `premise` - The term to use as the premise for the lookup.
    ///
    /// # Returns
    /// An `Option` containing a vector of `Arc<Task>` if any implications are found.
    pub fn get_implications_by_premise(&self, premise: &Term) -> Option<Vec<&Arc<Task>>> {
        self.implication_index
            .get(&premise.hash)
            .map(|task_hashes| {
                task_hashes
                    .iter()
                    .filter_map(|hash| self.tasks.get(hash))
                    .collect()
            })
    }

    /// Retrieves all inheritance tasks where the given term is the subject.
    ///
    /// # Arguments
    /// * `subject` - The term to use as the subject for the lookup.
    ///
    /// # Returns
    /// An `Option` containing a vector of `Arc<Task>` if any inheritance tasks are found.
    pub fn get_inheritance_by_subject(&self, subject: &Term) -> Option<Vec<&Arc<Task>>> {
        self.inheritance_index
            .get(&subject.hash)
            .map(|task_hashes| {
                task_hashes
                    .iter()
                    .filter_map(|hash| self.tasks.get(hash))
                    .collect()
            })
    }

    /// Returns an iterator over all tasks currently in memory.
    pub fn get_all_tasks_iter(&self) -> impl Iterator<Item = &Arc<Task>> {
        self.tasks.values()
    }
}

#[cfg(test)]
mod tests;