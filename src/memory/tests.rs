use super::*;
use crate::data_structures::{punctuation::Punctuation, task::Task, term::Term};
use std::sync::Arc;

// Helper function to create a new task with a given term and occurrence time.
fn create_task(term: Arc<Term>, time: u64, priority: f64) -> Task {
    let mut task = Task::new(term, Punctuation::Belief, None);
    task.occurrence_time = Some(time);
    task.priority = priority;
    task
}

#[test]
fn test_add_task_populates_temporal_index() {
    let mut memory = Memory::new();
    let term = Arc::new(Term::new_atom("test_term"));
    let task = create_task(term.clone(), 100, 0.5);
    let task_hash = task.term.hash.clone();

    memory.add_task(task);

    // Check that the temporal index contains the task.
    let task_hashes = memory.temporal_index.get(&100).unwrap();
    assert!(task_hashes.contains(&task_hash));
}

#[test]
fn test_get_tasks_by_time_range() {
    let mut memory = Memory::new();
    let term1 = Arc::new(Term::new_atom("term1"));
    let term2 = Arc::new(Term::new_atom("term2"));
    let term3 = Arc::new(Term::new_atom("term3"));

    memory.add_task(create_task(term1, 100, 0.5));
    memory.add_task(create_task(term2, 200, 0.5));
    memory.add_task(create_task(term3, 300, 0.5));

    // Query a range that includes two of the tasks.
    let tasks = memory.get_tasks_by_time_range(150, 350);
    assert_eq!(tasks.len(), 2);
    assert!(tasks.iter().any(|t| t.term.name == "term2"));
    assert!(tasks.iter().any(|t| t.term.name == "term3"));
}

#[test]
fn test_get_tasks_by_time_range_empty() {
    let mut memory = Memory::new();
    let term1 = Arc::new(Term::new_atom("term1"));
    memory.add_task(create_task(term1, 100, 0.5));

    // Query a range that contains no tasks.
    let tasks = memory.get_tasks_by_time_range(200, 300);
    assert!(tasks.is_empty());
}

#[test]
fn test_consolidation_moves_high_priority_tasks() {
    let mut memory = Memory::new();
    let term_high = Arc::new(Term::new_atom("high_priority"));
    let term_low = Arc::new(Term::new_atom("low_priority"));

    // Add a high-priority and a low-priority task.
    memory.add_task(create_task(term_high.clone(), 100, 0.8));
    memory.add_task(create_task(term_low.clone(), 100, 0.4));

    // Initially, both tasks should be in short-term memory.
    assert_eq!(memory.short_term_tasks.len(), 2);
    assert_eq!(memory.long_term_tasks.len(), 0);

    // Consolidate memory.
    memory.consolidate(200);

    // The high-priority task should be moved to long-term memory.
    assert_eq!(memory.short_term_tasks.len(), 1);
    assert_eq!(memory.long_term_tasks.len(), 1);
    assert!(memory.long_term_tasks.contains_key(&term_high.hash));
    assert!(!memory.short_term_tasks.contains_key(&term_high.hash));
    assert!(memory.short_term_tasks.contains_key(&term_low.hash));

    // Check that consolidation stats are updated.
    assert_eq!(memory.consolidation_count, 1);
    assert_eq!(memory.last_consolidation, 200);
}

#[test]
fn test_consolidation_leaves_low_priority_tasks() {
    let mut memory = Memory::new();
    let term1 = Arc::new(Term::new_atom("low1"));
    let term2 = Arc::new(Term::new_atom("low2"));

    memory.add_task(create_task(term1, 100, 0.3));
    memory.add_task(create_task(term2, 100, 0.6));

    memory.consolidate(200);

    // No tasks should have been moved.
    assert_eq!(memory.short_term_tasks.len(), 2);
    assert_eq!(memory.long_term_tasks.len(), 0);
}