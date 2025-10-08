use super::*;
use crate::data_structures::{punctuation::Punctuation, task::Task, term_type::TermType};
use std::sync::Arc;

// Helper to create a new task with a given term, time, priority, and optional expiration.
fn create_task(term: Arc<Term>, time: u64, priority: f64, expiration: Option<u64>) -> Task {
    let mut task = Task::new(term, Punctuation::Belief, None);
    task.occurrence_time = Some(time);
    task.priority = priority;
    task.expiration_time = expiration;
    task
}

#[test]
fn test_add_task_populates_indexes() {
    let mut memory = Memory::new();
    let s = memory.create_or_get_atom("S");
    let p = memory.create_or_get_atom("P");
    let term = memory.create_or_get_compound_term(TermType::Inheritance, vec![s.clone(), p.clone()]);
    let task = create_task(term.clone(), 100, 0.5, None);
    let task_hash = task.term.hash.clone();

    memory.add_task(task);

    // Check temporal index
    assert!(memory.temporal_index.get(&100).unwrap().contains(&task_hash));
    // Check inheritance index
    assert!(memory.inheritance_index.get(&s.hash).unwrap().contains(&task_hash));
}

#[test]
fn test_get_tasks_by_time_range() {
    let mut memory = Memory::new();
    let term1 = memory.create_or_get_atom("term1");
    let term2 = memory.create_or_get_atom("term2");
    let term3 = memory.create_or_get_atom("term3");

    memory.add_task(create_task(term1, 100, 0.5, None));
    memory.add_task(create_task(term2, 200, 0.5, None));
    memory.add_task(create_task(term3, 300, 0.5, None));

    let tasks = memory.get_tasks_by_time_range(150, 350);
    assert_eq!(tasks.len(), 2);
    assert!(tasks.iter().any(|t| t.term.name == "term2"));
    assert!(tasks.iter().any(|t| t.term.name == "term3"));
}

#[test]
fn test_create_and_get_atom_reuse() {
    let mut memory = Memory::new();
    let atom1 = memory.create_or_get_atom("A");
    let atom2 = memory.create_or_get_atom("A");
    assert_eq!(Arc::ptr_eq(&atom1, &atom2), true);
    assert_eq!(memory.term_storage.len(), 1);
}

#[test]
fn test_create_and_get_compound_term_reuse() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom("A");
    let b = memory.create_or_get_atom("B");
    let term1 = memory.create_or_get_compound_term(TermType::Inheritance, vec![a.clone(), b.clone()]);
    let term2 = memory.create_or_get_compound_term(TermType::Inheritance, vec![a.clone(), b.clone()]);
    assert_eq!(Arc::ptr_eq(&term1, &term2), true);
    assert_eq!(memory.term_storage.len(), 3); // A, B, and (A --> B)
}

#[test]
fn test_canonicalization_commutative_sorting() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom("A");
    let b = memory.create_or_get_atom("B");
    // Create terms in different orders
    let term1 = memory.create_or_get_compound_term(TermType::Conjunction, vec![a.clone(), b.clone()]);
    let term2 = memory.create_or_get_compound_term(TermType::Conjunction, vec![b.clone(), a.clone()]);
    // Pointers should be the same due to canonicalization
    assert_eq!(Arc::ptr_eq(&term1, &term2), true);
    // The name should be in the canonical (sorted) order.
    assert_eq!(term1.name, "(&, A, B)");
}

#[test]
fn test_canonicalization_flattening_and_deduplication() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom("A");
    let b = memory.create_or_get_atom("B");
    let c = memory.create_or_get_atom("C");

    // Create (&, B, A)
    let inner_conj = memory.create_or_get_compound_term(TermType::Conjunction, vec![b.clone(), a.clone()]);
    // Create (&, C, (&, B, A), A)
    let term = memory.create_or_get_compound_term(TermType::Conjunction, vec![c.clone(), inner_conj, a.clone()]);

    // Should be simplified to (&, A, B, C)
    assert_eq!(term.name, "(&, A, B, C)");
    assert_eq!(term.components.as_ref().unwrap().len(), 3);

    // Check that the canonical version is also reused
    let term2 = memory.create_or_get_compound_term(TermType::Conjunction, vec![a.clone(), b.clone(), c.clone()]);
    assert_eq!(Arc::ptr_eq(&term, &term2), true);
}

#[test]
fn test_reduction_double_negation() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom("A");
    let neg_a = memory.create_or_get_compound_term(TermType::Negation, vec![a.clone()]);
    let double_neg_a = memory.create_or_get_compound_term(TermType::Negation, vec![neg_a]);

    // (--, (--, A)) should reduce to A, so the pointers should be equal.
    assert_eq!(Arc::ptr_eq(&double_neg_a, &a), true);
}

#[test]
fn test_remove_task_from_short_term() {
    let mut memory = Memory::new();
    let term = memory.create_or_get_atom("A");
    memory.add_task(create_task(term.clone(), 100, 0.5, None));
    assert_eq!(memory.short_term_tasks.len(), 1);
    assert_eq!(memory.total_tasks, 1);

    let removed = memory.remove_task(&term.hash);
    assert_eq!(removed, true);
    assert_eq!(memory.short_term_tasks.len(), 0);
    assert_eq!(memory.total_tasks, 0);
}

#[test]
fn test_remove_task_cleans_up_all_indexes() {
    let mut memory = Memory::new();
    let s = memory.create_or_get_atom("S");
    let p = memory.create_or_get_atom("P");
    let term = memory.create_or_get_compound_term(TermType::Inheritance, vec![s.clone(), p.clone()]);
    let task_hash = term.hash.clone();
    memory.add_task(create_task(term.clone(), 100, 0.5, None));

    // Check indexes were populated
    assert!(memory.inheritance_index.get(&s.hash).is_some());
    assert!(memory.temporal_index.get(&100).is_some());

    // Remove the task
    memory.remove_task(&task_hash);

    // Check indexes are cleaned up
    assert!(memory.inheritance_index.get(&s.hash).unwrap().is_empty());
    assert!(memory.temporal_index.get(&100).is_none());
}

#[test]
fn test_consolidation_forgets_expired_tasks() {
    let mut memory = Memory::new();
    let term1 = memory.create_or_get_atom("expired");
    let term2 = memory.create_or_get_atom("not_expired");

    // Expired task (expiration time is in the past)
    memory.add_task(create_task(term1.clone(), 100, 0.5, Some(150)));
    // Non-expired task
    memory.add_task(create_task(term2.clone(), 100, 0.5, Some(250)));

    assert_eq!(memory.total_tasks, 2);
    memory.consolidate(200); // Current time is 200
    assert_eq!(memory.total_tasks, 1);
    assert!(memory.get_task(&term2.hash).is_some());
    assert!(memory.get_task(&term1.hash).is_none());
}

#[test]
fn test_consolidation_forgets_and_promotes() {
    let mut memory = Memory::new();
    let term_expired = memory.create_or_get_atom("expired");
    let term_high = memory.create_or_get_atom("high_priority");
    let term_low = memory.create_or_get_atom("low_priority");

    // Add tasks
    memory.add_task(create_task(term_expired, 100, 0.9, Some(150))); // Expired
    memory.add_task(create_task(term_high.clone(), 100, 0.8, Some(250))); // High-priority, not expired
    memory.add_task(create_task(term_low.clone(), 100, 0.4, Some(250))); // Low-priority, not expired

    assert_eq!(memory.short_term_tasks.len(), 3);
    assert_eq!(memory.long_term_tasks.len(), 0);

    // Consolidate at time 200
    memory.consolidate(200);

    // Expired task should be gone
    assert_eq!(memory.total_tasks, 2);
    // High-priority task should be in long-term memory
    assert_eq!(memory.long_term_tasks.len(), 1);
    assert!(memory.long_term_tasks.contains_key(&term_high.hash));
    // Low-priority task should remain in short-term memory
    assert_eq!(memory.short_term_tasks.len(), 1);
    assert!(memory.short_term_tasks.contains_key(&term_low.hash));
}