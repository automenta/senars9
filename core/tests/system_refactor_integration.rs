use app::cycle::clock::IterativeClock;
use app::data_structures::term::Term;
use app::System;

#[test]
fn test_system_end_to_end_reasoning() {
    // 1. Setup: Create a new System with an IterativeClock for predictable time.
    let clock = Box::new(IterativeClock::new());
    let mut system = System::new(clock);

    // 2. Input: Add initial beliefs to the system.
    // The system will automatically use its clock to timestamp these inputs.
    system.input("(cat --> mammal). %1.0;0.9%");
    system.input("(mammal --> animal). %1.0;0.9%");
    system.input("(dog --> mammal). %1.0;0.9%");

    // Verify initial state
    assert_eq!(system.memory.short_term_tasks.len(), 3, "Should have 3 initial tasks.");
    // The clock hasn't ticked yet, so all concepts should have been created at time 0.
    let cat_hash = Term::compute_hash_for_atom("cat");
    let cat_concept = system.memory.concept_storage.get(&cat_hash).unwrap();
    assert_eq!(cat_concept.created_at, 0);

    // 3. Tick 1: Run the first cognitive cycle.
    system.tick();

    // 4. Verification after Tick 1:
    // The system should have derived new knowledge. The most prominent is the syllogism.
    // Let's check for the derived task `(cat --> animal)`.
    // We create the concepts separately to avoid borrow checker errors.
    let cat_concept = system.memory.create_or_get_atom_concept("cat", 0);
    let animal_concept = system.memory.create_or_get_atom_concept("animal", 0);
    let derived_concept = system.memory.create_or_get_compound_concept(
        app::data_structures::term_type::TermType::Inheritance,
        vec![
            cat_concept,
            animal_concept,
        ],
        0, // Timestamp doesn't matter for lookup
    );

    let derived_task = system.memory.get_task(&derived_concept.term.hash);
    assert!(derived_task.is_some(), "System should have derived (cat --> animal).");

    // The derived task should have a creation timestamp of 1, as it was created during the first tick.
    let derived_task = derived_task.unwrap();
    assert_eq!(derived_task.created_at, 1, "Derived task should be timestamped to cycle 1.");
    assert_eq!(derived_task.occurrence_time, Some(1));

    // 5. Tick 2: Run another cycle.
    system.tick();

    // 6. Verification after Tick 2:
    // Let's add a new belief and see if a new concept's timestamp is correct.
    system.input("(bird --> animal)."); // This happens at time 2

    let bird_hash = Term::compute_hash_for_atom("bird");
    let bird_concept = system.memory.concept_storage.get(&bird_hash).unwrap();
    // The concept 'bird' was created during cycle 2.
    assert_eq!(bird_concept.created_at, 2, "New concept 'bird' should be timestamped to cycle 2.");

    // The system should now have more tasks in memory after more reasoning.
    // The exact number can be complex to predict, but it should be greater than the initial set + the one we checked.
    assert!(system.memory.short_term_tasks.len() > 4, "Memory should contain more tasks after multiple cycles.");
}