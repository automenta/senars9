pub mod index_manager;

use crate::data_structures::{
    concept::Concept, task::Task, term::Term, term_type::TermType,
};
use index_manager::IndexManager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// Represents the memory of the SeNARS system, storing knowledge and active tasks.
///
/// The memory is designed with a dual storage architecture (short-term and long-term)
/// and uses indexes for efficient, content-addressable retrieval of information. It is
/// also responsible for the lifecycle of all `Concept` instances, ensuring that each unique
/// term is represented by a single, canonical concept object.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Memory {
    /// Storage for all unique concepts in the system, ensuring that each term has a single instance.
    /// The key is the term's content hash.
    pub concept_storage: HashMap<String, Arc<Concept>>,
    /// Short-term memory for recently added or accessed tasks. This acts as a buffer
    /// for new information before it's evaluated for long-term storage.
    pub short_term_tasks: HashMap<String, Arc<Task>>,
    /// Long-term memory for consolidated, important knowledge. Tasks are moved here
    /// from short-term memory if they are deemed important enough.
    pub long_term_tasks: HashMap<String, Arc<Task>>,

    /// The index manager handles all task indexing.
    pub index_manager: IndexManager,

    // Statistics
    pub total_tasks: u64,
    pub consolidation_count: u64,
    pub last_consolidation: u64,
}

impl Memory {
    /// Creates a new, empty `Memory` component.
    pub fn new() -> Self {
        Memory {
            concept_storage: HashMap::new(),
            short_term_tasks: HashMap::new(),
            long_term_tasks: HashMap::new(),
            index_manager: IndexManager::new(),
            total_tasks: 0,
            consolidation_count: 0,
            last_consolidation: 0,
        }
    }

    /// Adds a new task to short-term memory, creating its concept if necessary,
    /// and updates all relevant indexes via the `IndexManager`.
    pub fn add_task(&mut self, task: Task, current_time: u64) {
        // First, ensure concepts for the task's term and all its sub-terms exist.
        self.ensure_concept_exists_recursive(&task.term, current_time);

        let task_arc = Arc::new(task);
        let term_hash = task_arc.term().hash.clone();

        // Add to task storage and update count if it's a new task.
        if self.short_term_tasks.insert(term_hash, task_arc.clone()).is_none() {
            self.total_tasks += 1;
        }

        // Delegate indexing to the IndexManager.
        self.index_manager.add_task(&task_arc);
    }

    /// Retrieves a task from memory by its term hash.
    pub fn get_task(&self, term_hash: &str) -> Option<&Arc<Task>> {
        self.short_term_tasks.get(term_hash).or_else(|| self.long_term_tasks.get(term_hash))
    }

    /// Retrieves all implication tasks where the given term is the premise.
    pub fn get_implications_by_premise(&self, premise: &Term) -> Option<Vec<&Arc<Task>>> {
        self.query_index(|im| im.get_implication_hashes_by_premise(&premise.hash))
    }

    /// Retrieves all inheritance tasks where the given term is the predicate.
    pub fn get_inheritance_by_predicate(&self, predicate: &Term) -> Option<Vec<&Arc<Task>>> {
        self.query_index(|im| im.get_inheritance_hashes_by_predicate(&predicate.hash))
    }

    /// Retrieves all inheritance tasks where the given term is the subject.
    pub fn get_inheritance_by_subject(&self, subject: &Term) -> Option<Vec<&Arc<Task>>> {
        self.query_index(|im| im.get_inheritance_hashes_by_subject(&subject.hash))
    }

    /// Retrieves all similarity tasks related to the given term.
    pub fn get_similarities(&self, term: &Term) -> Option<Vec<&Arc<Task>>> {
        self.query_index(|im| im.get_similarity_hashes(&term.hash))
    }

    /// Returns an iterator over all tasks in both short-term and long-term memory.
    pub fn get_all_tasks_iter(&self) -> impl Iterator<Item = &Arc<Task>> {
        self.short_term_tasks.values().chain(self.long_term_tasks.values())
    }

    /// Retrieves tasks within a specific time range.
    pub fn get_tasks_by_time_range(&self, start_time: u64, end_time: u64) -> Vec<&Arc<Task>> {
        let hashes = self.index_manager.get_task_hashes_by_time_range(start_time, end_time);
        self.get_tasks_from_hashes(hashes)
    }

    /// A helper function to query an index and convert the resulting hashes to task references.
    fn query_index<'a, F>(&'a self, query_fn: F) -> Option<Vec<&'a Arc<Task>>>
    where
        F: Fn(&'a IndexManager) -> Option<&'a std::collections::HashSet<String>>,
    {
        query_fn(&self.index_manager).map(|hashes| self.get_tasks_from_hashes(hashes))
    }

    /// A helper function to convert a collection of task hashes into a vector of task references.
    fn get_tasks_from_hashes<'a, T: IntoIterator<Item = &'a String>>(&'a self, task_hashes: T) -> Vec<&'a Arc<Task>> {
        task_hashes
            .into_iter()
            .filter_map(|hash| self.get_task(hash))
            .collect()
    }

    /// Creates or retrieves an atomic concept from memory, ensuring uniqueness.
    pub fn create_or_get_atom_concept(&mut self, name: &str, created_at: u64) -> Arc<Concept> {
        let temp_hash = Term::compute_hash_for_atom(name);

        if let Some(concept) = self.concept_storage.get(&temp_hash) {
            return concept.clone();
        }

        let new_term = Term::new_atom(name);
        let new_concept = Arc::new(Concept::new(new_term, created_at));
        self.concept_storage.insert(new_concept.term.hash.clone(), new_concept.clone());
        new_concept
    }

    /// Creates or retrieves a compound concept, applying simplification and canonicalization rules.
    /// This method uses the term-level simplification logic and then handles concept storage.
    pub fn create_or_get_compound_concept(
        &mut self,
        term_type: TermType,
        components: Vec<Arc<Concept>>,
        created_at: u64,
    ) -> Arc<Concept> {
        // Extract terms from concepts to pass to the term factory method.
        let term_components: Vec<Arc<Term>> = components.iter().map(|c| c.term.clone()).collect();

        // Use the centralized term creation logic.
        let simplified_term = Term::create_compound(term_type, term_components);

        // Now, find or create the concept for this canonical term.
        if let Some(concept) = self.concept_storage.get(&simplified_term.hash) {
            return concept.clone();
        }

        let new_concept = Arc::new(Concept::new(simplified_term.clone(), created_at));
        self.concept_storage.insert(simplified_term.hash.clone(), new_concept.clone());
        new_concept
    }

    /// Removes a task from memory completely, updating storage and indexes.
    pub fn remove_task(&mut self, term_hash: &str) -> bool {
        // Remove from storage first. If it doesn't exist, there's nothing to do.
        let task_to_remove = self.short_term_tasks.remove(term_hash)
            .or_else(|| self.long_term_tasks.remove(term_hash));

        if let Some(task) = task_to_remove {
            // If the task was removed, update the total count.
            self.total_tasks -= 1;
            // Delegate the removal of the task from all indexes.
            self.index_manager.remove_task(&task);
            true
        } else {
            // Task was not found in memory.
            false
        }
    }

    /// Performs a memory consolidation cycle.
    ///
    /// This process involves three main activities:
    /// 1. **Forgetting**: Removing tasks that have expired.
    /// 2. **Decaying**: Reducing the priority of tasks that haven't been accessed recently.
    /// 3. **Promoting**: Moving high-priority tasks from short-term to long-term memory.
    pub fn consolidate(&mut self, current_time: u64) {
        // --- 1. Forgetting ---
        let expired_task_hashes: Vec<String> = self
            .get_all_tasks_iter()
            .filter(|task| task.is_expired(current_time))
            .map(|task| task.term().hash.clone())
            .collect();

        for hash in expired_task_hashes {
            self.remove_task(&hash);
        }

        // --- 2. Priority Decay ---
        // A small, constant factor by which priority decays each cycle for inactive tasks.
        const PRIORITY_DECAY_FACTOR: f32 = 0.001;

        for task in self.get_all_tasks_iter() {
            // Only decay priority if the task was not accessed in the current cycle.
            if task.get_accessed_at() < current_time {
                let current_priority = task.get_priority();
                // Ensure priority does not fall below zero.
                let new_priority = (current_priority - PRIORITY_DECAY_FACTOR).max(0.0);
                task.set_priority(new_priority);
            }
        }

        // --- 3. Promotion to Long-Term Memory ---
        let mut tasks_to_move = Vec::new();
        for (hash, task) in self.short_term_tasks.iter() {
            // Use the getter for priority now that it's atomic.
            if task.get_priority() >= 0.7 {
                tasks_to_move.push(hash.clone());
            }
        }

        for hash in tasks_to_move {
            if let Some(task) = self.short_term_tasks.remove(&hash) {
                self.long_term_tasks.insert(hash, task);
            }
        }

        self.consolidation_count += 1;
        self.last_consolidation = current_time;
    }

    /// Recursively ensures that a concept for the given term and all its sub-terms exist in memory.
    fn ensure_concept_exists_recursive(&mut self, term: &Arc<Term>, current_time: u64) {
        // If it's a compound term, first ensure its components exist.
        // This is the recursive step (post-order traversal).
        if let Some(components) = &term.components {
            for component in components {
                self.ensure_concept_exists_recursive(component, current_time);
            }
        }

        // Now, handle the current term. Use `entry` to insert only if it doesn't exist.
        // This is the base case for the recursion and the final step after recursing.
        self.concept_storage
            .entry(term.hash.clone())
            .or_insert_with(|| Arc::new(Concept::new(term.clone(), current_time)));
    }
}

#[cfg(test)]
mod tests;