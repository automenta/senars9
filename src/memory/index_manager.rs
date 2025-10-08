use crate::data_structures::task::Task;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Arc;

/// Manages all content-based and temporal indexes for tasks in memory.
///
/// This struct is responsible for maintaining the data structures that allow
/// for efficient retrieval of tasks based on their content (e.g., by subject,
/// predicate, or premise) or their occurrence time. It is owned by the `Memory`
/// component, which delegates all indexing operations to it.
#[derive(Debug, Default)]
pub struct IndexManager {
    /// Index for implication relationships: `premise_hash -> {task_hash, ...}`.
    pub implication_index: HashMap<String, HashSet<String>>,
    /// Index for inheritance relationships: `subject_hash -> {task_hash, ...}`.
    pub inheritance_index: HashMap<String, HashSet<String>>,
    /// Index for inheritance relationships: `predicate_hash -> {task_hash, ...}`.
    pub inheritance_index_by_predicate: HashMap<String, HashSet<String>>,
    /// Index for similarity relationships: `term_hash -> {task_hash, ...}`.
    pub similarity_index: HashMap<String, HashSet<String>>,
    /// Index for temporal relationships: `timestamp -> {task_hash, ...}`.
    pub temporal_index: BTreeMap<u64, HashSet<String>>,
}

use crate::data_structures::term_type::TermType;

impl IndexManager {
    /// Creates a new, empty `IndexManager`.
    pub fn new() -> Self {
        IndexManager::default()
    }

    /// Adds a task's hash to the relevant content and temporal indexes.
    pub fn add_task(&mut self, task: &Arc<Task>) {
        let term_hash = &task.term().hash;

        // Update temporal index
        if let Some(time) = task.occurrence_time {
            self.temporal_index
                .entry(time)
                .or_default()
                .insert(term_hash.clone());
        }

        // Update content-based indexes
        match task.term().term_type {
            TermType::Implication => {
                if let Some(premise) = &task.term().subject {
                    self.implication_index
                        .entry(premise.hash.clone())
                        .or_default()
                        .insert(term_hash.clone());
                }
            }
            TermType::Inheritance => {
                if let Some(subject) = &task.term().subject {
                    self.inheritance_index
                        .entry(subject.hash.clone())
                        .or_default()
                        .insert(term_hash.clone());
                }
                if let Some(predicate) = &task.term().predicate {
                    self.inheritance_index_by_predicate
                        .entry(predicate.hash.clone())
                        .or_default()
                        .insert(term_hash.clone());
                }
            }
            TermType::Similarity => {
                if let (Some(subj), Some(pred)) = (&task.term().subject, &task.term().predicate) {
                    self.similarity_index
                        .entry(subj.hash.clone())
                        .or_default()
                        .insert(term_hash.clone());
                    self.similarity_index
                        .entry(pred.hash.clone())
                        .or_default()
                        .insert(term_hash.clone());
                }
            }
            _ => {}
        }
    }

    /// Removes a task's hash from all indexes.
    pub fn remove_task(&mut self, task: &Arc<Task>) {
        let term_hash = &task.term().hash;

        // Update temporal index
        if let Some(time) = task.occurrence_time {
            if let Some(hashes) = self.temporal_index.get_mut(&time) {
                hashes.remove(term_hash);
                if hashes.is_empty() {
                    self.temporal_index.remove(&time);
                }
            }
        }

        // Update content-based indexes
        match task.term().term_type {
            TermType::Implication => {
                if let Some(premise) = &task.term().subject {
                    Self::remove_from_hash_index(&mut self.implication_index, &premise.hash, term_hash);
                }
            }
            TermType::Inheritance => {
                if let Some(subject) = &task.term().subject {
                    Self::remove_from_hash_index(&mut self.inheritance_index, &subject.hash, term_hash);
                }
                if let Some(predicate) = &task.term().predicate {
                    Self::remove_from_hash_index(
                        &mut self.inheritance_index_by_predicate,
                        &predicate.hash,
                        term_hash,
                    );
                }
            }
            TermType::Similarity => {
                if let (Some(subj), Some(pred)) = (&task.term().subject, &task.term().predicate) {
                    Self::remove_from_hash_index(&mut self.similarity_index, &subj.hash, term_hash);
                    Self::remove_from_hash_index(&mut self.similarity_index, &pred.hash, term_hash);
                }
            }
            _ => {}
        }
    }

    /// Retrieves hashes of implication tasks where the given term is the premise.
    pub fn get_implication_hashes_by_premise(&self, premise_hash: &str) -> Option<&HashSet<String>> {
        self.implication_index.get(premise_hash)
    }

    /// Retrieves hashes of inheritance tasks where the given term is the predicate.
    pub fn get_inheritance_hashes_by_predicate(&self, predicate_hash: &str) -> Option<&HashSet<String>> {
        self.inheritance_index_by_predicate.get(predicate_hash)
    }

    /// Retrieves hashes of inheritance tasks where the given term is the subject.
    pub fn get_inheritance_hashes_by_subject(&self, subject_hash: &str) -> Option<&HashSet<String>> {
        self.inheritance_index.get(subject_hash)
    }

    /// Retrieves hashes of similarity tasks related to the given term.
    pub fn get_similarity_hashes(&self, term_hash: &str) -> Option<&HashSet<String>> {
        self.similarity_index.get(term_hash)
    }

    /// Retrieves task hashes within a specific time range.
    pub fn get_task_hashes_by_time_range(&self, start_time: u64, end_time: u64) -> Vec<&String> {
        self.temporal_index
            .range(start_time..=end_time)
            .flat_map(|(_, task_hashes)| task_hashes.iter())
            .collect()
    }

    /// A helper function to remove a value from a `HashSet` within a `HashMap`.
    /// If the `HashSet` becomes empty after removal, the key is also removed
    /// from the `HashMap`.
    fn remove_from_hash_index(
        index: &mut HashMap<String, HashSet<String>>,
        key: &str,
        value: &str,
    ) {
        if let Some(hashes) = index.get_mut(key) {
            hashes.remove(value);
            if hashes.is_empty() {
                index.remove(key);
            }
        }
    }
}