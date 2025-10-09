use super::*;
use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType,
};
use std::sync::Arc;

// Helper to create a new task with a given term, time, priority, and optional expiration.
fn create_task(term: Arc<Term>, time: u64, priority: f32, expiration: Option<u64>) -> Task {
    let mut task = Task::new(term, Punctuation::Belief, None, time, time);
    task.set_priority(priority);
    task.expiration_time = expiration;
    task
}

#[test]
fn test_add_task_populates_indexes() {
    let mut memory = Memory::new();
    let s_concept = memory.create_or_get_atom_concept("S", 0);
    let p_concept = memory.create_or_get_atom_concept("P", 0);
    let concept = memory.create_or_get_compound_concept(
        TermType::Inheritance,
        vec![s_concept.clone(), p_concept.clone()],
        0,
    );
    let task = create_task(concept.term.clone(), 100, 0.5, None);
    let task_hash = task.term().hash.clone();

    memory.add_task(task, 100);

    // Check temporal index
    assert!(memory.index_manager.temporal_index.get(&100).unwrap().contains(&task_hash));
    // Check inheritance index
    assert!(memory.index_manager.inheritance_index.get(&s_concept.term.hash).unwrap().contains(&task_hash));
}

#[test]
fn test_get_tasks_by_time_range() {
    let mut memory = Memory::new();
    let concept1 = memory.create_or_get_atom_concept("term1", 0);
    let concept2 = memory.create_or_get_atom_concept("term2", 0);
    let concept3 = memory.create_or_get_atom_concept("term3", 0);

    memory.add_task(create_task(concept1.term.clone(), 100, 0.5, None), 100);
    memory.add_task(create_task(concept2.term.clone(), 200, 0.5, None), 200);
    memory.add_task(create_task(concept3.term.clone(), 300, 0.5, None), 300);

    let tasks = memory.get_tasks_by_time_range(150, 350);
    assert_eq!(tasks.len(), 2);
    assert!(tasks.iter().any(|t| t.term().name == "term2"));
    assert!(tasks.iter().any(|t| t.term().name == "term3"));
}

#[test]
fn test_create_and_get_atom_reuse() {
    let mut memory = Memory::new();
    let concept1 = memory.create_or_get_atom_concept("A", 0);
    let concept2 = memory.create_or_get_atom_concept("A", 1); // different time, should still be reused
    assert_eq!(Arc::ptr_eq(&concept1, &concept2), true);
    assert_eq!(memory.concept_storage.len(), 1);
}

#[test]
fn test_create_and_get_compound_term_reuse() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);
    let concept1 =
        memory.create_or_get_compound_concept(TermType::Inheritance, vec![a.clone(), b.clone()], 0);
    let concept2 =
        memory.create_or_get_compound_concept(TermType::Inheritance, vec![a.clone(), b.clone()], 1);
    assert_eq!(Arc::ptr_eq(&concept1, &concept2), true);
    assert_eq!(memory.concept_storage.len(), 3); // A, B, and (A --> B)
}

#[test]
fn test_canonicalization_commutative_sorting() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);
    // Create terms in different orders
    let concept1 =
        memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), b.clone()], 0);
    let concept2 =
        memory.create_or_get_compound_concept(TermType::Conjunction, vec![b.clone(), a.clone()], 0);
    // Pointers should be the same due to canonicalization
    assert_eq!(Arc::ptr_eq(&concept1, &concept2), true);
    // The name should be in the canonical (sorted) order.
    assert_eq!(concept1.term.name, "(&, A, B)");
}

#[test]
fn test_canonicalization_flattening_and_deduplication() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);
    let c = memory.create_or_get_atom_concept("C", 0);

    // Create (&, B, A)
    let inner_conj =
        memory.create_or_get_compound_concept(TermType::Conjunction, vec![b.clone(), a.clone()], 0);
    // Create (&, C, (&, B, A), A)
    let concept = memory
        .create_or_get_compound_concept(TermType::Conjunction, vec![c.clone(), inner_conj, a.clone()], 0);

    // Should be simplified to (&, A, B, C)
    assert_eq!(concept.term.name, "(&, A, B, C)");
    assert_eq!(concept.term.components.as_ref().unwrap().len(), 3);

    // Check that the canonical version is also reused
    let concept2 = memory
        .create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), b.clone(), c.clone()], 0);
    assert_eq!(Arc::ptr_eq(&concept, &concept2), true);
}

#[test]
fn test_reduction_double_negation() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let neg_a = memory.create_or_get_compound_concept(TermType::Negation, vec![a.clone()], 0);
    let double_neg_a = memory.create_or_get_compound_concept(TermType::Negation, vec![neg_a], 0);

    // (--, (--, A)) should reduce to A, so the pointers should be equal.
    assert_eq!(Arc::ptr_eq(&double_neg_a, &a), true);
}

#[test]
fn test_remove_task_from_short_term() {
    let mut memory = Memory::new();
    let concept = memory.create_or_get_atom_concept("A", 0);
    memory.add_task(create_task(concept.term.clone(), 100, 0.5, None), 100);
    assert_eq!(memory.short_term_tasks.len(), 1);
    assert_eq!(memory.total_tasks, 1);

    let removed = memory.remove_task(&concept.term.hash);
    assert_eq!(removed, true);
    assert_eq!(memory.short_term_tasks.len(), 0);
    assert_eq!(memory.total_tasks, 0);
}

#[test]
fn test_remove_task_cleans_up_all_indexes() {
    let mut memory = Memory::new();
    let s = memory.create_or_get_atom_concept("S", 0);
    let p = memory.create_or_get_atom_concept("P", 0);
    let concept =
        memory.create_or_get_compound_concept(TermType::Inheritance, vec![s.clone(), p.clone()], 0);
    let task_hash = concept.term.hash.clone();
    memory.add_task(create_task(concept.term.clone(), 100, 0.5, None), 100);

    // Check indexes were populated
    assert!(memory.index_manager.inheritance_index.get(&s.term.hash).is_some());
    assert!(memory.index_manager.temporal_index.get(&100).is_some());

    // Remove the task
    memory.remove_task(&task_hash);

    // Check indexes are cleaned up
    assert!(memory.index_manager.inheritance_index.get(&s.term.hash).is_none());
    assert!(memory.index_manager.temporal_index.get(&100).is_none());
}

#[test]
fn test_consolidation_forgets_expired_tasks() {
    let mut memory = Memory::new();
    let concept1 = memory.create_or_get_atom_concept("expired", 0);
    let concept2 = memory.create_or_get_atom_concept("not_expired", 0);

    // Expired task (expiration time is in the past)
    memory.add_task(create_task(concept1.term.clone(), 100, 0.5, Some(150)), 100);
    // Non-expired task
    memory.add_task(create_task(concept2.term.clone(), 100, 0.5, Some(250)), 100);

    assert_eq!(memory.total_tasks, 2);
    memory.consolidate(200); // Current time is 200
    assert_eq!(memory.total_tasks, 1);
    assert!(memory.get_task(&concept2.term.hash).is_some());
    assert!(memory.get_task(&concept1.term.hash).is_none());
}

#[test]
fn test_consolidation_forgets_and_promotes() {
    let mut memory = Memory::new();
    let concept_expired = memory.create_or_get_atom_concept("expired", 0);
    let concept_high = memory.create_or_get_atom_concept("high_priority", 0);
    let concept_low = memory.create_or_get_atom_concept("low_priority", 0);

    // Add tasks
    memory.add_task(create_task(concept_expired.term.clone(), 100, 0.9, Some(150)), 100); // Expired
    memory.add_task(create_task(concept_high.term.clone(), 100, 0.8, Some(250)), 100); // High-priority, not expired
    memory.add_task(create_task(concept_low.term.clone(), 100, 0.4, Some(250)), 100); // Low-priority, not expired

    assert_eq!(memory.short_term_tasks.len(), 3);
    assert_eq!(memory.long_term_tasks.len(), 0);

    // Consolidate at time 200
    memory.consolidate(200);

    // Expired task should be gone
    assert_eq!(memory.total_tasks, 2);
    // High-priority task should be in long-term memory
    assert_eq!(memory.long_term_tasks.len(), 1);
    assert!(memory.long_term_tasks.contains_key(&concept_high.term.hash));
    // Low-priority task should remain in short-term memory
    assert_eq!(memory.short_term_tasks.len(), 1);
    assert!(memory.short_term_tasks.contains_key(&concept_low.term.hash));
}

#[test]
fn test_consolidation_priority_decay() {
    let mut memory = Memory::new();
    let concept = memory.create_or_get_atom_concept("decay_test", 0);
    let initial_priority = 0.5;
    memory.add_task(create_task(concept.term.clone(), 100, initial_priority, None), 100);

    let task = memory.get_task(&concept.term.hash).unwrap();
    assert_eq!(task.get_priority(), initial_priority);

    // --- Cycle 1 (time=101) ---
    // Task was not accessed, so its priority should decay.
    memory.consolidate(101);
    let decayed_priority_1 = task.get_priority();
    assert!(decayed_priority_1 < initial_priority);

    // --- Cycle 2 (time=102) ---
    // Access the task, so its priority should NOT decay in this cycle.
    task.set_accessed_at(102);
    memory.consolidate(102);
    let decayed_priority_2 = task.get_priority();
    // Priority should be the same as after the last decay.
    assert_eq!(decayed_priority_2, decayed_priority_1);

    // --- Cycle 3 (time=103) ---
    // Do not access the task, so its priority should decay again.
    memory.consolidate(103);
    let decayed_priority_3 = task.get_priority();
    assert!(decayed_priority_3 < decayed_priority_2);
}

// --- Advanced Boolean Reduction Tests ---

#[test]
fn test_reduction_de_morgans_negated_conjunction() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);

    // Build (--, (&, A, B))
    let conj = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), b.clone()], 0);
    let neg_conj = memory.create_or_get_compound_concept(TermType::Negation, vec![conj], 0);

    // Should simplify to (|, (--, A), (--, B))
    let neg_a = memory.create_or_get_compound_concept(TermType::Negation, vec![a.clone()], 0);
    let neg_b = memory.create_or_get_compound_concept(TermType::Negation, vec![b.clone()], 0);
    let expected = memory.create_or_get_compound_concept(TermType::Disjunction, vec![neg_a, neg_b], 0);

    assert_eq!(neg_conj.term.name, expected.term.name);
    assert_eq!(Arc::ptr_eq(&neg_conj, &expected), true);
}

#[test]
fn test_reduction_de_morgans_negated_disjunction() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);

    // Build (--, (|, A, B))
    let disj = memory.create_or_get_compound_concept(TermType::Disjunction, vec![a.clone(), b.clone()], 0);
    let neg_disj = memory.create_or_get_compound_concept(TermType::Negation, vec![disj], 0);

    // Should simplify to (&, (--, A), (--, B))
    let neg_a = memory.create_or_get_compound_concept(TermType::Negation, vec![a.clone()], 0);
    let neg_b = memory.create_or_get_compound_concept(TermType::Negation, vec![b.clone()], 0);
    let expected = memory.create_or_get_compound_concept(TermType::Conjunction, vec![neg_a, neg_b], 0);

    assert_eq!(neg_disj.term.name, expected.term.name);
    assert_eq!(Arc::ptr_eq(&neg_disj, &expected), true);
}

#[test]
fn test_reduction_contradiction_elimination() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);
    let neg_a = memory.create_or_get_compound_concept(TermType::Negation, vec![a.clone()], 0);

    // Build (&, B, A, (--, A))
    let term = memory.create_or_get_compound_concept(TermType::Conjunction, vec![b.clone(), a.clone(), neg_a], 0);

    // Should simplify to B
    assert_eq!(Arc::ptr_eq(&term, &b), true);
}

#[test]
fn test_reduction_absorption_law_conj_over_disj() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);

    // Test (&, A, (|, A, B)) -> A
    let disj = memory.create_or_get_compound_concept(TermType::Disjunction, vec![a.clone(), b.clone()], 0);
    let term = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), disj], 0);
    assert_eq!(Arc::ptr_eq(&term, &a), true);
}

#[test]
fn test_reduction_absorption_law_disj_over_conj() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);

    // Test (|, A, (&, A, B)) -> A
    let conj = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), b.clone()], 0);
    let term = memory.create_or_get_compound_concept(TermType::Disjunction, vec![a.clone(), conj], 0);
    assert_eq!(Arc::ptr_eq(&term, &a), true);
}

#[test]
#[ignore] // Ignoring because the distributive law is disabled to prevent infinite loops.
fn test_reduction_distributive_law() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);
    let c = memory.create_or_get_atom_concept("C", 0);

    // Build (&, A, (|, B, C))
    let disj = memory.create_or_get_compound_concept(TermType::Disjunction, vec![b.clone(), c.clone()], 0);
    let term = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), disj], 0);

    // Should simplify to (|, (&, A, B), (&, A, C))
    let conj_ab = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), b.clone()], 0);
    let conj_ac = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), c.clone()], 0);
    let expected = memory.create_or_get_compound_concept(TermType::Disjunction, vec![conj_ab, conj_ac], 0);

    assert_eq!(term.term.name, expected.term.name);
    assert_eq!(Arc::ptr_eq(&term, &expected), true);
}

#[test]
fn test_reduction_complex_nested_case_de_morgan_and_flatten() {
    let mut memory = Memory::new();
    let a = memory.create_or_get_atom_concept("A", 0);
    let b = memory.create_or_get_atom_concept("B", 0);
    let c = memory.create_or_get_atom_concept("C", 0);

    // Build (&, A, (--, (|, B, C)))
    let disj = memory.create_or_get_compound_concept(TermType::Disjunction, vec![b.clone(), c.clone()], 0);
    let neg_disj = memory.create_or_get_compound_concept(TermType::Negation, vec![disj], 0);
    let term = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a.clone(), neg_disj], 0);

    // Should simplify to (&, A, (--, B), (--, C))
    // 1. De Morgan's on (--, (|, B, C)) -> (&, (--, B), (--, C))
    // 2. Flatten with outer conjunction -> (&, A, (--, B), (--, C))
    let neg_b = memory.create_or_get_compound_concept(TermType::Negation, vec![b.clone()], 0);
    let neg_c = memory.create_or_get_compound_concept(TermType::Negation, vec![c.clone()], 0);
    let expected = memory.create_or_get_compound_concept(TermType::Conjunction, vec![a, neg_b, neg_c], 0);

    assert_eq!(term.term.name, expected.term.name);
    assert_eq!(Arc::ptr_eq(&term, &expected), true);
}