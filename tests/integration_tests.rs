use app::{
    cycle::Cycle,
    data_structures::punctuation::Punctuation,
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
    let premise1 = parser::parse("(bird --> animal).").unwrap();
    memory.add_task(premise1);
    let premise2 = parser::parse("(animal --> living_thing).").unwrap();
    memory.add_task(premise2);

    // 3. Run the cognitive cycle
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // 4. Verify that the conclusion was derived and learned
    let conclusion_term = parser::parse("(bird --> living_thing).").unwrap().term;
    let derived_task = memory.get_task(&conclusion_term.hash);

    assert!(derived_task.is_some(), "System did not derive the expected conclusion: (bird --> living_thing).");
}

#[test]
fn test_full_reasoning_cycle_analogy() {
    // 1. Initialize components
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // 2. Populate memory with initial knowledge
    let premise1 = parser::parse("(dog <-> wolf).").unwrap();
    memory.add_task(premise1);
    let premise2 = parser::parse("(dog --> has_fur).").unwrap();
    memory.add_task(premise2);

    // 3. Run the cognitive cycle
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // 4. Verify that the question was derived and learned
    let conclusion_term = parser::parse("(wolf --> has_fur)?").unwrap().term;
    let derived_task = memory.get_task(&conclusion_term.hash);

    assert!(derived_task.is_some(), "System did not derive the expected question: (wolf --> has_fur)?");
    if let Some(task) = derived_task {
        assert_eq!(task.punctuation, Punctuation::Question);
    }
}