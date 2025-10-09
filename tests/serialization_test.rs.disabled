use app::data_structures::{punctuation::Punctuation, task::Task, term::Term, truth_value::TruthValue};
use app::memory::Memory;
use std::sync::Arc;

#[test]
fn test_memory_serialization_deserialization() {
    // 1. Setup: Create and populate an initial Memory instance.
    let mut original_memory = Memory::new();
    let current_time = 0;

    // Create some terms
    let term_a = Term::new_atom("A");
    let term_b = Term::new_atom("B");
    let term_c = Term::new_atom("C");
    let term_ab = Term::create_compound(app::data_structures::term_type::TermType::Inheritance, vec![term_a.clone(), term_b.clone()]);
    let term_bc = Term::create_compound(app::data_structures::term_type::TermType::Inheritance, vec![term_b.clone(), term_c.clone()]);

    // Create some tasks
    let task1 = Task::new(
        term_ab.clone(),
        Punctuation::Belief,
        Some(TruthValue { frequency: 1.0, confidence: 0.9 }),
        current_time,
        current_time,
    );
    let task2 = Task::new(
        term_bc.clone(),
        Punctuation::Belief,
        Some(TruthValue { frequency: 1.0, confidence: 0.8 }),
        current_time,
        current_time,
    );
    let task3 = Task::new(term_a.clone(), Punctuation::Question, None, current_time, current_time);

    original_memory.add_task(task1, current_time);
    original_memory.add_task(task2, current_time);
    original_memory.add_task(task3, current_time);

    // 2. Action: Serialize the Memory instance to a JSON string.
    let serialized_memory = serde_json::to_string_pretty(&original_memory).expect("Failed to serialize memory");

    println!("Serialized Memory:\n{}", serialized_memory);

    // 3. Action: Deserialize the JSON string back into a new Memory instance.
    let deserialized_memory: Memory = serde_json::from_str(&serialized_memory).expect("Failed to deserialize memory");

    // 4. Verification: Assert that the deserialized memory is equivalent to the original.
    // We cannot do a direct string comparison of the serialized JSON because the order of
    // elements in HashMaps is not guaranteed. Instead, we do a deep comparison of the fields.

    // Compare simple fields
    assert_eq!(original_memory.total_tasks, deserialized_memory.total_tasks);
    assert_eq!(original_memory.consolidation_count, deserialized_memory.consolidation_count);
    assert_eq!(original_memory.last_consolidation, deserialized_memory.last_consolidation);

    // Compare task storage (HashMap's PartialEq is sufficient if Arc<Task>'s PartialEq is correct)
    assert_eq!(original_memory.short_term_tasks, deserialized_memory.short_term_tasks);
    assert_eq!(original_memory.long_term_tasks, deserialized_memory.long_term_tasks);

    // Compare concept storage
    assert_eq!(original_memory.concept_storage, deserialized_memory.concept_storage);

    // Compare indexes. BTreeMap and HashSet comparisons are order-independent.
    assert_eq!(original_memory.index_manager.implication_index, deserialized_memory.index_manager.implication_index);
    assert_eq!(original_memory.index_manager.inheritance_index, deserialized_memory.index_manager.inheritance_index);
    assert_eq!(original_memory.index_manager.inheritance_index_by_predicate, deserialized_memory.index_manager.inheritance_index_by_predicate);
    assert_eq!(original_memory.index_manager.similarity_index, deserialized_memory.index_manager.similarity_index);
    assert_eq!(original_memory.index_manager.temporal_index, deserialized_memory.index_manager.temporal_index);
}