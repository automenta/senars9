use app::{
    cycle::Cycle,
    memory::Memory,
    parser,
    reasoning::Reasoner,
};

#[test]
fn test_full_reasoning_cycle_syllogism() {
    // 1. Initialize components
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // 2. Populate memory with initial knowledge
    // Premise 1: bird is a type of animal.
    let task1 = parser::parse("(bird --> animal).").expect("Failed to parse task 1");
    memory.add_task(task1);

    // Premise 2: animal is a type of living_thing.
    let task2 = parser::parse("(animal --> living_thing).").expect("Failed to parse task 2");
    memory.add_task(task2);

    // 3. Run the cognitive cycle to reason and learn
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // 4. Verify that the conclusion was derived and learned
    let conclusion_term = parser::parse("(bird --> living_thing).")
        .expect("Failed to parse conclusion term")
        .term;

    let derived_task = memory.get_task(&conclusion_term.hash);

    assert!(derived_task.is_some(), "System did not derive the expected conclusion.");

    if let Some(task) = derived_task {
        println!("SUCCESS: System derived and learned the conclusion: {}", task);
        // Optional: Add more specific assertions about the derived task's truth value, etc.
        assert_eq!(task.term.name, "(bird --> living_thing)");
    }
}