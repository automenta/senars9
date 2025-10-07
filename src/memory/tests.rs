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
    assert!(memory.tasks.is_empty());
    assert!(memory.implication_index.is_empty());
}

#[test]
fn test_add_and_get_task() {
    let mut memory = Memory::new();
    let task = create_belief_task("test_task");
    let task_hash = task.term.hash.clone();

    memory.add_task(task.clone());

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
    memory.add_task(task2.clone());

    let retrieved_task = memory.get_task(&task_hash).unwrap();
    assert_eq!(retrieved_task.priority, 0.99);
    assert_eq!(retrieved_task.term.hash, task2.term.hash);
}

#[test]
fn test_implication_indexing() {
    let mut memory = Memory::new();
    let term_a = Arc::new(Term::new_atom("A"));
    let term_b = Arc::new(Term::new_atom("B"));

    // Create an implication task: (A ==> B).
    let implication_term =
        Term::new_compound(TermType::Implication, vec![term_a.clone(), term_b.clone()]);
    let implication_task = Task::new(
        Arc::new(implication_term),
        Punctuation::Belief,
        Some(TruthValue {
            frequency: 1.0,
            confidence: 0.9,
        }),
    );
    let implication_hash = implication_task.term.hash.clone();
    memory.add_task(implication_task);

    // Retrieve implications by premise "A"
    let implications = memory.get_implications_by_premise(&term_a).unwrap();
    assert_eq!(implications.len(), 1);
    assert_eq!(implications[0].term.hash, implication_hash);

    // Ensure that searching for a non-existent premise returns None or empty
    let term_c = Arc::new(Term::new_atom("C"));
    assert!(memory.get_implications_by_premise(&term_c).is_none());
}