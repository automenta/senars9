use super::*;
use crate::data_structures::{
    punctuation::Punctuation,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};
use std::sync::Arc;

/// Helper to create a simple atomic belief task for testing.
fn create_belief_task(term_name: &str) -> Task {
    let term = Arc::new(Term::new_atom(term_name));
    Task::new(
        term,
        Punctuation::Belief,
        Some(TruthValue {
            frequency: 1.0,
            confidence: 0.9,
        }),
    )
}

#[test]
fn test_new_memory() {
    let memory = Memory::new();
    assert!(memory.short_term_tasks.is_empty());
    assert!(memory.long_term_tasks.is_empty());
    assert!(memory.implication_index.is_empty());
    assert!(memory.similarity_index.is_empty());
    assert_eq!(memory.total_tasks, 0);
}

#[test]
fn test_add_and_get_task() {
    let mut memory = Memory::new();
    let task = create_belief_task("test_task");
    let task_hash = task.term.hash.clone();

    memory.add_task(task.clone());

    // Task should be in short-term memory
    assert_eq!(memory.short_term_tasks.len(), 1);
    assert_eq!(memory.long_term_tasks.len(), 0);
    assert_eq!(memory.total_tasks, 1);

    // `get_task` should find it
    let retrieved_task = memory.get_task(&task_hash).unwrap();
    assert_eq!(retrieved_task.term.hash, task.term.hash);
    assert_eq!(retrieved_task.punctuation, task.punctuation);
}

#[test]
fn test_overwrite_task() {
    let mut memory = Memory::new();
    let task1 = create_belief_task("test_task");
    let task_hash = task1.term.hash.clone();

    let mut task2 = create_belief_task("test_task");
    task2.priority = 0.99; // Make it different

    memory.add_task(task1);
    assert_eq!(memory.total_tasks, 1);

    memory.add_task(task2.clone());
    assert_eq!(memory.total_tasks, 1, "Overwriting a task should not increment total_tasks");

    let retrieved_task = memory.get_task(&task_hash).unwrap();
    assert_eq!(retrieved_task.priority, 0.99);
    assert_eq!(retrieved_task.term.hash, task2.term.hash);
}

#[test]
fn test_implication_indexing() {
    let mut memory = Memory::new();
    let term_a = Arc::new(Term::new_atom("A"));
    let term_b = Arc::new(Term::new_atom("B"));

    let implication_term = Term::new_compound(TermType::Implication, vec![term_a.clone(), term_b.clone()]);
    let implication_task = Task::new(Arc::new(implication_term), Punctuation::Belief, None);
    let implication_hash = implication_task.term.hash.clone();
    memory.add_task(implication_task);

    let implications = memory.get_implications_by_premise(&term_a).unwrap();
    assert_eq!(implications.len(), 1);
    assert_eq!(implications[0].term.hash, implication_hash);

    let term_c = Arc::new(Term::new_atom("C"));
    assert!(memory.get_implications_by_premise(&term_c).is_none());
}

#[test]
fn test_similarity_indexing() {
    let mut memory = Memory::new();
    let term_dog = Arc::new(Term::new_atom("dog"));
    let term_wolf = Arc::new(Term::new_atom("wolf"));

    let similarity_term = Term::new_compound(TermType::Similarity, vec![term_dog.clone(), term_wolf.clone()]);
    let similarity_task = Task::new(Arc::new(similarity_term), Punctuation::Belief, None);
    let similarity_hash = similarity_task.term.hash.clone();
    memory.add_task(similarity_task);

    // Check retrieval by the first term
    let sims_from_dog = memory.get_similarities(&term_dog).unwrap();
    assert_eq!(sims_from_dog.len(), 1);
    assert_eq!(sims_from_dog[0].term.hash, similarity_hash);

    // Check retrieval by the second term
    let sims_from_wolf = memory.get_similarities(&term_wolf).unwrap();
    assert_eq!(sims_from_wolf.len(), 1);
    assert_eq!(sims_from_wolf[0].term.hash, similarity_hash);
}

#[test]
fn test_get_all_tasks_iter() {
    let mut memory = Memory::new();
    let task1 = create_belief_task("task1");
    let task2 = create_belief_task("task2");

    // Manually add one to long-term for testing purposes
    memory.long_term_tasks.insert(task2.term.hash.clone(), Arc::new(task2));
    memory.add_task(task1);

    let all_tasks: Vec<_> = memory.get_all_tasks_iter().collect();
    assert_eq!(all_tasks.len(), 2);
    assert!(all_tasks.iter().any(|t| t.term.name == "task1"));
    assert!(all_tasks.iter().any(|t| t.term.name == "task2"));
}