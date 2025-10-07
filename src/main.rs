use app::{
    cycle::Cycle,
    memory::Memory,
    parser,
    reasoning::Reasoner,
};

/// The main entry point for the SeNARS application.
///
/// This example demonstrates the core functionality of the system:
/// 1. Initializes the Memory, Reasoner, and Cycle components.
/// 2. Populates the memory with initial knowledge using the Narsese parser.
/// 3. Runs a cognitive cycle, which triggers the reasoner to derive new knowledge.
/// 4. The new knowledge is then learned by being added back into memory.
fn main() {
    println!("--- Initializing SeNARS System ---");

    // 1. Initialize components
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // 2. Populate memory with initial knowledge
    println!("--- Populating Memory with Initial Knowledge ---");
    // Premise 1: bird is a type of animal.
    let task1 = parser::parse("(bird --> animal).").expect("Failed to parse task 1");
    println!("Adding task: {}", task1);
    memory.add_task(task1);

    // Premise 2: animal is a type of living_thing.
    let task2 = parser::parse("(animal --> living_thing).").expect("Failed to parse task 2");
    println!("Adding task: {}", task2);
    memory.add_task(task2);

    // 3. Run the cognitive cycle to reason and learn
    let mut cycle = Cycle::new(&mut memory, &reasoner);
    cycle.run_cycle();

    // After the cycle, the memory should contain the derived conclusion (bird --> living_thing).
    let conclusion_term = parser::parse("(bird --> living_thing).")
        .expect("Failed to parse conclusion term")
        .term;
    match memory.get_task(&conclusion_term.hash) {
        Some(task) => {
            println!("\nSUCCESS: System derived and learned the conclusion: {}", task)
        }
        None => println!("\nFAILURE: System did not derive the expected conclusion."),
    }
}