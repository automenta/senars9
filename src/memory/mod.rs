use crate::data_structures::{
    concept::Concept, task::Task, term::Term, term_type::TermType,
};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::Arc;

/// Represents the memory of the SeNARS system, storing knowledge and active tasks.
///
/// The memory is designed with a dual storage architecture (short-term and long-term)
/// and uses indexes for efficient, content-addressable retrieval of information. It is
/// also responsible for the lifecycle of all `Concept` instances, ensuring that each unique
/// term is represented by a single, canonical concept object.
#[derive(Debug, Default)]
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

    /// Index for implication relationships: `premise_hash -> {task_hash, ...}`.
    implication_index: HashMap<String, HashSet<String>>,
    /// Index for inheritance relationships: `subject_hash -> {task_hash, ...}`.
    inheritance_index: HashMap<String, HashSet<String>>,
    /// Index for inheritance relationships: `predicate_hash -> {task_hash, ...}`.
    inheritance_index_by_predicate: HashMap<String, HashSet<String>>,
    /// Index for similarity relationships: `term_hash -> {task_hash, ...}`.
    similarity_index: HashMap<String, HashSet<String>>,
    /// Index for temporal relationships: `timestamp -> {task_hash, ...}`.
    temporal_index: BTreeMap<u64, HashSet<String>>,

    // Statistics
    total_tasks: u64,
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
            implication_index: HashMap::new(),
            inheritance_index: HashMap::new(),
            inheritance_index_by_predicate: HashMap::new(),
            similarity_index: HashMap::new(),
            temporal_index: BTreeMap::new(),
            total_tasks: 0,
            consolidation_count: 0,
            last_consolidation: 0,
        }
    }

    /// Adds a new task to short-term memory and updates all relevant indexes.
    pub fn add_task(&mut self, task: Task) {
        let task_arc = Arc::new(task);
        let term_hash = task_arc.term().hash.clone();

        if self.short_term_tasks.insert(term_hash.clone(), task_arc.clone()).is_none() {
            self.total_tasks += 1;
        }

        if let Some(time) = task_arc.occurrence_time {
            self.temporal_index
                .entry(time)
                .or_default()
                .insert(term_hash.clone());
        }

        match task_arc.term().term_type {
            TermType::Implication => {
                if let Some(premise) = &task_arc.term().subject {
                    self.implication_index
                        .entry(premise.hash.clone())
                        .or_default()
                        .insert(term_hash);
                }
            }
            TermType::Inheritance => {
                if let Some(subject) = &task_arc.term().subject {
                    self.inheritance_index
                        .entry(subject.hash.clone())
                        .or_default()
                        .insert(term_hash.clone());
                }
                if let Some(predicate) = &task_arc.term().predicate {
                    self.inheritance_index_by_predicate
                        .entry(predicate.hash.clone())
                        .or_default()
                        .insert(term_hash);
                }
            }
            TermType::Similarity => {
                if let (Some(subj), Some(pred)) = (&task_arc.term().subject, &task_arc.term().predicate) {
                    self.similarity_index.entry(subj.hash.clone()).or_default().insert(term_hash.clone());
                    self.similarity_index.entry(pred.hash.clone()).or_default().insert(term_hash);
                }
            }
            _ => {}
        }
    }

    /// Retrieves a task from memory by its term hash.
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

    /// Retrieves all inheritance tasks where the given term is the predicate.
    pub fn get_inheritance_by_predicate(&self, predicate: &Term) -> Option<Vec<&Arc<Task>>> {
        self.inheritance_index_by_predicate
            .get(&predicate.hash)
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
    pub fn get_tasks_by_time_range(&self, start_time: u64, end_time: u64) -> Vec<&Arc<Task>> {
        self.temporal_index
            .range(start_time..=end_time)
            .flat_map(|(_, task_hashes)| task_hashes.iter())
            .filter_map(|hash| self.get_task(hash))
            .collect()
    }

    /// Creates or retrieves an atomic concept from memory, ensuring uniqueness.
    pub fn create_or_get_atom(&mut self, name: &str, created_at: u64) -> Arc<Concept> {
        let temp_hash = Term::compute_hash_for_atom(name);

        if let Some(concept) = self.concept_storage.get(&temp_hash) {
            return concept.clone();
        }

        let new_term = Arc::new(Term::new_atom(name));
        let new_concept = Arc::new(Concept::new(new_term, created_at));
        self.concept_storage.insert(new_concept.term.hash.clone(), new_concept.clone());
        new_concept
    }

    /// Creates or retrieves a compound concept, applying simplification and canonicalization rules.
    pub fn create_or_get_compound_term(
        &mut self,
        term_type: TermType,
        components: Vec<Arc<Concept>>,
        created_at: u64,
    ) -> Arc<Concept> {
        // Extract terms from concepts for simplification logic
        let mut term_components: Vec<Arc<Term>> = components.iter().map(|c| c.term.clone()).collect();

        // 1. Associativity (Flattening) for n-ary operators
        if term_type == TermType::Conjunction || term_type == TermType::Disjunction {
            term_components = term_components.into_iter().flat_map(|comp_term| {
                if comp_term.term_type == term_type {
                    comp_term.components.as_ref().unwrap().clone()
                } else {
                    vec![comp_term]
                }
            }).collect();
        }

        // 2. Commutativity (Sorting) and Idempotency (Deduplication)
        let is_commutative = matches!(
            term_type,
            TermType::Conjunction | TermType::Disjunction | TermType::Similarity | TermType::Equivalence
        );

        if is_commutative {
            term_components.sort_by(|a, b| a.name.cmp(&b.name));
            term_components.dedup_by(|a, b| a.hash == b.hash);
        }

        // 3. 1-ary Reduction for Conjunction and Disjunction
        if (term_type == TermType::Conjunction || term_type == TermType::Disjunction) && term_components.len() == 1 {
            let reduced_term_hash = &term_components[0].hash;
            return self.concept_storage.get(reduced_term_hash).unwrap().clone();
        }

        // 4. Double Negation Reduction: (--, (--, A)) => A
        if term_type == TermType::Negation {
            if let Some(component_term) = term_components.first() {
                if component_term.term_type == TermType::Negation {
                    let inner_term_hash = &component_term.components.as_ref().unwrap()[0].hash;
                    return self.concept_storage.get(inner_term_hash).unwrap().clone();
                }
            }
        }

        let name = Term::generate_name(&term_type, &term_components);
        let final_hash = Term::compute_hash(&name, &term_type, &Some(term_components.clone()));

        if let Some(concept) = self.concept_storage.get(&final_hash) {
            return concept.clone();
        }

        let new_term = Arc::new(Term::create_compound_raw(
            name,
            term_type,
            term_components,
            final_hash,
        ));

        let new_concept = Arc::new(Concept::new(new_term, created_at));
        self.concept_storage.insert(new_concept.term.hash.clone(), new_concept.clone());
        new_concept
    }

    /// Removes a task from memory completely.
    pub fn remove_task(&mut self, term_hash: &str) -> bool {
        let task_to_remove = self.short_term_tasks.remove(term_hash)
            .or_else(|| self.long_term_tasks.remove(term_hash));

        if let Some(task) = task_to_remove {
            self.total_tasks -= 1;

            if let Some(time) = task.occurrence_time {
                if let Some(hashes) = self.temporal_index.get_mut(&time) {
                    hashes.remove(term_hash);
                    if hashes.is_empty() {
                        self.temporal_index.remove(&time);
                    }
                }
            }

            match task.term().term_type {
                TermType::Implication => {
                    if let Some(premise) = &task.term().subject {
                        if let Some(hashes) = self.implication_index.get_mut(&premise.hash) {
                            hashes.remove(term_hash);
                        }
                    }
                }
                TermType::Inheritance => {
                    if let Some(subject) = &task.term().subject {
                        if let Some(hashes) = self.inheritance_index.get_mut(&subject.hash) {
                            hashes.remove(term_hash);
                        }
                    }
                    if let Some(predicate) = &task.term().predicate {
                        if let Some(hashes) = self.inheritance_index_by_predicate.get_mut(&predicate.hash) {
                            hashes.remove(term_hash);
                        }
                    }
                }
                TermType::Similarity => {
                    if let (Some(subj), Some(pred)) = (&task.term().subject, &task.term().predicate) {
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

    /// Performs a memory consolidation cycle.
    pub fn consolidate(&mut self, current_time: u64) {
        let expired_task_hashes: Vec<String> = self
            .get_all_tasks_iter()
            .filter(|task| task.is_expired(current_time))
            .map(|task| task.term().hash.clone())
            .collect();

        for hash in expired_task_hashes {
            self.remove_task(&hash);
        }

        let mut tasks_to_move = Vec::new();
        for (hash, task) in self.short_term_tasks.iter() {
            if task.priority >= 0.7 {
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
}

#[cfg(test)]
mod tests;