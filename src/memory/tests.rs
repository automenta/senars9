use super::*;
use crate::data_structures::{
    punctuation::Punctuation,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};

fn create_dummy_task(name: &str) -> Task {
    Task {
        term: Term {
            name: name.to_string(),
            term_type: TermType::Atom,
            complexity: 1,
            subject: None,
            predicate: None,
            components: None,
            embedding: None,
            created_at: 0,
            hash: name.to_string(), // Simple hash for testing
        },
        punctuation: Punctuation::Belief,
        truth: Some(TruthValue {
            frequency: 1.0,
            confidence: 0.9,
        }),
        priority: 0.5,
        accessed_at: 0,
        created_at: 0,
        occurrence_time: None,
        expiration_time: None,
        is_in_focus_set: false,
        derivation_path: None,
    }
}

#[test]
fn test_new_memory() {
    let memory = Memory::new();
    assert!(memory.tasks.is_empty());
}

#[test]
fn test_add_and_get_task() {
    let mut memory = Memory::new();
    let task = create_dummy_task("test_task");

    // Add the task
    memory.add_task(task.clone());

    // Retrieve the task
    let retrieved_task = memory.get_task("test_task").unwrap();

    // Check if the retrieved task is the same
    assert_eq!(*retrieved_task, task);
}

#[test]
fn test_get_nonexistent_task() {
    let memory = Memory::new();
    assert!(memory.get_task("nonexistent").is_none());
}

#[test]
fn test_overwrite_task() {
    let mut memory = Memory::new();
    let task1 = create_dummy_task("test_task");
    let mut task2 = create_dummy_task("test_task");
    task2.priority = 0.99; // Make it different

    memory.add_task(task1);
    memory.add_task(task2.clone());

    let retrieved_task = memory.get_task("test_task").unwrap();
    assert_eq!(retrieved_task.priority, 0.99);
    assert_eq!(*retrieved_task, task2);
}