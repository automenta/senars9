use crate::data_structures::{task::Task, term::Term, term_type::TermType};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Arc;

/// Represents the memory of the SeNARS system, storing knowledge and active tasks.
///
/// The memory is designed with a dual storage architecture (short-term and long-term)
/// and uses indexes for efficient, content-addressable retrieval of information.
#[derive(Debug, Default)]
pub struct Memory {
    /// Short-term memory for recently added or accessed tasks.
    pub short_term_tasks: HashMap<String, Arc<Task>>,
    /// Long-term memory for consolidated, important knowledge.
    pub long_term_tasks: HashMap<String, Arc<Task>>,

    /// Index for implication relationships: premise_hash -> {task_hash, ...}
    implication_index: HashMap<String, HashSet<String>>,
    /// Index for inheritance relationships: subject_hash -> {task_hash, ...}
    inheritance_index: HashMap<String, HashSet<String>>,
    /// Index for similarity relationships: term_hash -> {task_hash, ...}
    similarity_index: HashMap<String, HashSet<String>>,
    /// Index for temporal relationships: timestamp -> {task_hash, ...}
    /// Using BTreeMap for efficient range queries.
    temporal_index: BTreeMap<u64, HashSet<String>>,

    // Statistics
    /// Total number of tasks currently in memory.
    total_tasks: u64,
    /// Number of consolidation cycles performed.
    pub consolidation_count: u64,
    /// Timestamp of the last consolidation cycle.
    pub last_consolidation: u64,
}

impl Memory {
    /// Creates a new, empty `Memory` component.
    pub fn new() -> Self {
        Memory {
            short_term_tasks: HashMap::new(),
            long_term_tasks: HashMap::new(),
            implication_index: HashMap::new(),
            inheritance_index: HashMap::new(),
            similarity_index: HashMap::new(),
            temporal_index: BTreeMap::new(),
            total_tasks: 0,
            consolidation_count: 0,
            last_consolidation: 0,
        }
    }

    /// Adds a task to short-term memory and updates the relevant indexes.
    ///
    /// New tasks are always added to short-term memory first.
    /// The method also updates indexes for efficient retrieval.
    pub fn add_task(&mut self, task: Task) {
        let task_arc = Arc::new(task);
        let term_hash = task_arc.term.hash.clone();

        // Add to short-term memory, overwriting if it exists.
        if self.short_term_tasks.insert(term_hash.clone(), task_arc.clone()).is_none() {
            self.total_tasks += 1;
        }

        // Update temporal index if the task has an occurrence time.
        if let Some(time) = task_arc.occurrence_time {
            self.temporal_index
                .entry(time)
                .or_default()
                .insert(term_hash.clone());
        }

        // Update content-based indexes based on the term type.
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
            TermType::Similarity => {
                if let (Some(subj), Some(pred)) = (&task_arc.term.subject, &task_arc.term.predicate) {
                    self.similarity_index.entry(subj.hash.clone()).or_default().insert(term_hash.clone());
                    self.similarity_index.entry(pred.hash.clone()).or_default().insert(term_hash);
                }
            }
            _ => {}
        }
    }

    /// Retrieves a task from memory by its term hash, checking both short-term and long-term memory.
    pub fn get_task(&self, term_hash: &str) -> Option<&Arc<Task>> {
        self.short_term_tasks.get(term_hash).or_else(|| self.long_term_tasks.get(term_hash))
    }

    /// Retrieves all implication tasks where the given term is the premise.
    pub fn get_implications_by_premise(&self, premise: &Term) -> Option<Vec<&Arc<Task>>> {
        self.implication_index
            .get(&premise.hash)
            .map(|task_hashes| {
                task_hashes
                    .iter()
                    .filter_map(|hash| self.get_task(hash))
                    .collect()
            })
    }

    /// Retrieves all inheritance tasks where the given term is the subject.
    pub fn get_inheritance_by_subject(&self, subject: &Term) -> Option<Vec<&Arc<Task>>> {
        self.inheritance_index
            .get(&subject.hash)
            .map(|task_hashes| {
                task_hashes
                    .iter()
                    .filter_map(|hash| self.get_task(hash))
                    .collect()
            })
    }

    /// Retrieves all similarity tasks related to the given term.
    pub fn get_similarities(&self, term: &Term) -> Option<Vec<&Arc<Task>>> {
        self.similarity_index
            .get(&term.hash)
            .map(|task_hashes| {
                task_hashes
                    .iter()
                    .filter_map(|hash| self.get_task(hash))
                    .collect()
            })
    }

    /// Returns an iterator over all tasks in both short-term and long-term memory.
    pub fn get_all_tasks_iter(&self) -> impl Iterator<Item = &Arc<Task>> {
        self.short_term_tasks.values().chain(self.long_term_tasks.values())
    }

    /// Retrieves tasks within a specific time range.
    ///
    /// # Arguments
    /// * `start_time` - The start of the time range (inclusive).
    /// * `end_time` - The end of the time range (inclusive).
    pub fn get_tasks_by_time_range(&self, start_time: u64, end_time: u64) -> Vec<&Arc<Task>> {
        self.temporal_index
            .range(start_time..=end_time)
            .flat_map(|(_, task_hashes)| task_hashes.iter())
            .filter_map(|hash| self.get_task(hash))
            .collect()
    }

    /// Moves tasks from short-term to long-term memory based on priority.
    ///
    /// This is a simplified consolidation logic. A more advanced implementation would
    /// consider factors like access frequency, utility, and system resources.
    pub fn consolidate(&mut self, current_time: u64) {
        let mut tasks_to_move = Vec::new();
        // Identify tasks to move based on a priority threshold.
        for (hash, task) in self.short_term_tasks.iter() {
            if task.priority >= 0.7 {
                tasks_to_move.push(hash.clone());
            }
        }

        // Move the selected tasks from short-term to long-term memory.
        for hash in tasks_to_move {
            if let Some(task) = self.short_term_tasks.remove(&hash) {
                self.long_term_tasks.insert(hash, task);
            }
        }

        self.consolidation_count += 1;
        self.last_consolidation = current_time;
    }
}

#[cfg(test)]
mod tests;