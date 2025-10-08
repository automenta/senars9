use crate::data_structures::{task::Task, term::Term, term_type::TermType};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Arc;

/// Represents the memory of the SeNARS system, storing knowledge and active tasks.
///
/// The memory is designed with a dual storage architecture (short-term and long-term)
/// and uses indexes for efficient, content-addressable retrieval of information. It is
/// also responsible for the lifecycle of all `Term` instances, ensuring that each unique
/// term is represented by a single, canonical object.
#[derive(Debug, Default)]
pub struct Memory {
    /// Storage for all unique terms in the system, ensuring that each term has a single instance.
    /// The key is the term's content hash.
    pub term_storage: HashMap<String, Arc<Term>>,
    /// Short-term memory for recently added or accessed tasks. This acts as a buffer
    /// for new information before it's evaluated for long-term storage.
    pub short_term_tasks: HashMap<String, Arc<Task>>,
    /// Long-term memory for consolidated, important knowledge. Tasks are moved here
    /// from short-term memory if they are deemed important enough.
    pub long_term_tasks: HashMap<String, Arc<Task>>,

    /// Index for implication relationships: `premise_hash -> {task_hash, ...}`.
    /// Allows for efficient lookup of implications `(premise ==> conclusion)`.
    implication_index: HashMap<String, HashSet<String>>,
    /// Index for inheritance relationships: `subject_hash -> {task_hash, ...}`.
    /// Allows for efficient lookup of inheritance statements `(subject --> predicate)`.
    inheritance_index: HashMap<String, HashSet<String>>,
    /// Index for similarity relationships: `term_hash -> {task_hash, ...}`.
    /// Allows for efficient lookup of similarity statements `(term1 <-> term2)`.
    similarity_index: HashMap<String, HashSet<String>>,
    /// Index for temporal relationships: `timestamp -> {task_hash, ...}`.
    /// Using a `BTreeMap` allows for efficient time-based range queries.
    temporal_index: BTreeMap<u64, HashSet<String>>,

    // Statistics
    /// Total number of tasks currently in memory (both short-term and long-term).
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
            term_storage: HashMap::new(),
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

    /// Adds a new task to short-term memory and updates all relevant indexes.
    ///
    /// If a task with the same term hash already exists, it will be overwritten.
    /// This method is the primary way to introduce new information into the system.
    ///
    /// # Arguments
    /// * `task` - The `Task` to be added to memory.
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

    /// Creates or retrieves an atomic term from memory, ensuring uniqueness.
    ///
    /// If an atomic term with the given `name` already exists in `term_storage`, a
    /// reference to the existing term is returned. Otherwise, a new `Term` is created,
    /// stored, and a reference to it is returned. This ensures that every unique
    /// atomic term is represented by a single object in memory.
    ///
    /// # Arguments
    /// * `name` - The string name of the atomic term (e.g., "cat", "A").
    ///
    /// # Returns
    /// An `Arc<Term>` pointing to the unique instance of the atomic term.
    pub fn create_or_get_atom(&mut self, name: &str) -> Arc<Term> {
        let _term_type = TermType::Atom;
        // Simplified hash calculation for lookup, must match Term's internal logic.
        let temp_hash = Term::compute_hash_for_atom(name);

        if let Some(term) = self.term_storage.get(&temp_hash) {
            return term.clone();
        }

        let new_term = Arc::new(Term::new_atom(name, 0)); // `created_at` is set to 0 initially.
        self.term_storage.insert(new_term.hash.clone(), new_term.clone());
        new_term
    }

    /// Creates or retrieves a compound term, applying simplification and canonicalization rules.
    ///
    /// This method is the sole entry point for creating compound terms. It performs several
    /// critical functions to ensure terms are stored in a canonical form:
    /// 1.  **Simplification**: Applies logical reduction rules, such as flattening nested
    ///     associative operators (e.g., `(&, A, (&, B, C))` becomes `(&, A, B, C)`) and
    ///     reducing double negations.
    /// 2.  **Canonicalization**: For commutative operators, it sorts components by hash to
    ///     ensure a consistent, canonical representation (e.g., `(&, B, A)` becomes `(&, A, B)`).
    /// 3.  **Uniqueness**: Checks if a term with the same canonical hash already exists in
    ///     `term_storage`. If so, it returns a reference to the existing term. Otherwise, it
    ///     creates and stores a new one.
    ///
    /// # Arguments
    /// * `term_type` - The `TermType` of the compound term to create.
    /// * `components` - A `Vec<Arc<Term>>` of the components of the term.
    ///
    /// # Returns
    /// An `Arc<Term>` pointing to the unique, canonical instance of the compound term.
    pub fn create_or_get_compound_term(&mut self, term_type: TermType, mut components: Vec<Arc<Term>>) -> Arc<Term> {
        // --- Apply simplification and canonicalization rules ---
        // This logic is moved from the original `Term::create_compound`

        // 1. Associativity (Flattening) for n-ary operators
        if term_type == TermType::Conjunction || term_type == TermType::Disjunction {
            components = components.into_iter().flat_map(|comp| {
                if comp.term_type == term_type {
                    comp.components.as_ref().unwrap().clone()
                } else {
                    vec![comp]
                }
            }).collect();
        }

        // 2. Commutativity (Sorting) and Idempotency (Deduplication)
        let is_commutative = matches!(
            term_type,
            TermType::Conjunction | TermType::Disjunction | TermType::Similarity | TermType::Equivalence
        );

        if is_commutative {
            // Sort by name for a predictable, alphabetical canonical order.
            components.sort_by(|a, b| a.name.cmp(&b.name));
            components.dedup_by(|a, b| a.hash == b.hash);
        }

        // 3. 1-ary Reduction for Conjunction and Disjunction
        if (term_type == TermType::Conjunction || term_type == TermType::Disjunction) && components.len() == 1 {
            return components.pop().unwrap();
        }

        // 4. Double Negation Reduction: (--, (--, A)) => A
        if term_type == TermType::Negation {
            if let Some(component) = components.first() {
                if component.term_type == TermType::Negation {
                    return component.components.as_ref().unwrap()[0].clone();
                }
            }
        }

        // --- End of simplification rules ---

        let name = Term::generate_name(&term_type, &components);
        let final_hash = Term::compute_hash(&name, &term_type, &Some(components.clone()));

        if let Some(term) = self.term_storage.get(&final_hash) {
            return term.clone();
        }

        let new_term = Arc::new(Term::create_compound_raw(
            name,
            term_type,
            components,
            0, // `created_at` timestamp
            final_hash,
        ));

        self.term_storage.insert(new_term.hash.clone(), new_term.clone());
        new_term
    }

    /// Removes a task from memory completely, including from all storage and indexes.
    ///
    /// This method ensures that all traces of a task are purged from the system. It removes
    /// the task from both short-term and long-term storage and cleans up any references
    /// in the `implication_index`, `inheritance_index`, `similarity_index`, and `temporal_index`.
    ///
    /// # Arguments
    /// * `term_hash` - The hash of the term identifying the task to remove.
    ///
    /// # Returns
    /// `true` if the task was found and removed, `false` otherwise.
    pub fn remove_task(&mut self, term_hash: &str) -> bool {
        let task_to_remove = if let Some(task) = self.short_term_tasks.remove(term_hash) {
            Some(task)
        } else {
            self.long_term_tasks.remove(term_hash)
        };

        if let Some(task) = task_to_remove {
            self.total_tasks -= 1;

            // Remove from temporal index
            if let Some(time) = task.occurrence_time {
                if let Some(hashes) = self.temporal_index.get_mut(&time) {
                    hashes.remove(term_hash);
                    if hashes.is_empty() {
                        self.temporal_index.remove(&time);
                    }
                }
            }

            // Remove from content-based indexes
            match task.term.term_type {
                TermType::Implication => {
                    if let Some(premise) = &task.term.subject {
                        if let Some(hashes) = self.implication_index.get_mut(&premise.hash) {
                            hashes.remove(term_hash);
                        }
                    }
                }
                TermType::Inheritance => {
                    if let Some(subject) = &task.term.subject {
                        if let Some(hashes) = self.inheritance_index.get_mut(&subject.hash) {
                            hashes.remove(term_hash);
                        }
                    }
                }
                TermType::Similarity => {
                    if let (Some(subj), Some(pred)) = (&task.term.subject, &task.term.predicate) {
                        if let Some(hashes) = self.similarity_index.get_mut(&subj.hash) {
                            hashes.remove(term_hash);
                        }
                        if let Some(hashes) = self.similarity_index.get_mut(&pred.hash) {
                            hashes.remove(term_hash);
                        }
                    }
                }
                _ => {}
            }
            true
        } else {
            false
        }
    }

    /// Performs a memory consolidation cycle, which involves two main operations:
    ///
    /// 1.  **Forgetting**: Iterates through all tasks and removes any that have expired
    ///     based on their `expiration_time` relative to the `current_time`.
    /// 2.  **Promotion**: Moves high-priority tasks (priority >= 0.7) from short-term
    ///     memory to long-term memory, signifying their importance and persistence.
    ///
    /// This method is crucial for managing memory growth and focusing the system's
    /// attention on relevant information.
    ///
    /// # Arguments
    /// * `current_time` - The current system time, used to check for task expiration.
    pub fn consolidate(&mut self, current_time: u64) {
        // --- 1. Forget Expired Tasks ---
        // Collect hashes of all expired tasks to avoid borrowing issues.
        let expired_task_hashes: Vec<String> = self
            .get_all_tasks_iter()
            .filter(|task| task.is_expired(current_time))
            .map(|task| task.term.hash.clone())
            .collect();

        // Remove each expired task from memory.
        for hash in expired_task_hashes {
            self.remove_task(&hash);
        }

        // --- 2. Promote High-Priority Tasks ---
        let mut tasks_to_move = Vec::new();
        // Identify tasks in short-term memory that are ready for promotion.
        for (hash, task) in self.short_term_tasks.iter() {
            if task.priority >= 0.7 { // Priority threshold for consolidation.
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