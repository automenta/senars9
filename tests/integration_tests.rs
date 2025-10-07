use app::{
    cycle::Cycle,
    memory::Memory,
    parser,
    reasoning::Reasoner,
};

/// This is an integration test for the core reasoning cycle of the SeNARS system.
///
/// It verifies the end-to-end workflow:
/// 1. Parsing Narsese statements into tasks.
/// 2. Adding tasks to memory.
/// 3. Running a cognitive cycle.
/// 4. Checking if the reasoner correctly derives a new task.
/// 5. Verifying that the new task is added back to memory.
#[test]
fn test_full_reasoning_cycle_syllogism() {
    // 1. Initialize components
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // 2. Add initial knowledge (premises for a syllogism)
    // Premise 1: (bird --> animal).
    let task1 = parser::parse("(bird --> animal).").unwrap();
    // Premise 2: (animal --> living_thing).
    let task2 = parser::parse("(animal --> living_thing).").unwrap();

    memory.add_task(task1);
    memory.add_task(task2);

    // 3. Run a cognitive cycle
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // 4. Verify the result
    // The system should have derived the conclusion: (bird --> living_thing).
    let conclusion_term = parser::parse("(bird --> living_thing).").unwrap().term;
    let conclusion_task = memory.get_task(&conclusion_term.hash);

    assert!(conclusion_task.is_some(), "Conclusion task was not found in memory");

    let unwrapped_task = conclusion_task.unwrap();
    assert_eq!(unwrapped_task.term.hash, conclusion_term.hash);
    assert!(unwrapped_task.is_belief());

    println!("Successfully derived and learned: {}", unwrapped_task);
}