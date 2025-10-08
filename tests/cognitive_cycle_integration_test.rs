use app::cycle::Cycle;
use app::data_structures::punctuation::Punctuation;
use app::data_structures::term_type::TermType;
use app::memory::Memory;
use app::parser::parse;
use app::reasoning::Reasoner;

/// This integration test verifies that the core components of the system
/// (`Memory`, `Reasoner`, `Cycle`) work together to perform a basic inference.
#[test]
fn test_deductive_syllogism_integration() {
    // 1. Initialize the core components.
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // 2. Parse the initial premises and add them to memory.
    // Premise 1: (cat --> mammal).
    let premise1 = parse("(cat --> mammal).", &mut memory).expect("Failed to parse premise 1");
    memory.add_task(premise1);

    // Premise 2: (mammal --> animal).
    let premise2 = parse("(mammal --> animal).", &mut memory).expect("Failed to parse premise 2");
    memory.add_task(premise2);

    // 3. Run a single cognitive cycle.
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // 4. Verify that the expected conclusion was derived.
    // We expect the conclusion: (cat --> animal).
    // To check if it exists, we first construct the term as the system would.
    // We must create the component terms first to avoid borrow checker errors.
    let cat_term = memory.create_or_get_atom("cat");
    let animal_term = memory.create_or_get_atom("animal");
    let conclusion_term =
        memory.create_or_get_compound_term(TermType::Inheritance, vec![cat_term, animal_term]);

    // Now, we retrieve the task from memory using the term's hash.
    let conclusion_task = memory
        .get_task(&conclusion_term.hash)
        .expect("Conclusion task '(cat --> animal)' was not found in memory.");

    // 5. Assert the properties of the derived task.
    assert_eq!(conclusion_task.term.hash, conclusion_term.hash);
    assert_eq!(conclusion_task.punctuation, Punctuation::Belief);

    let truth = conclusion_task.truth.as_ref().unwrap();
    // The truth value is based on the placeholder logic in `deductive_syllogism.rs`.
    assert_eq!(truth.frequency, 1.0);
    assert_eq!(truth.confidence, 0.81);
}