pub mod data_structures;
pub mod parser;
pub mod memory;
pub mod cycle;
pub mod reasoning;

use data_structures::{
    punctuation::Punctuation,
    task::Task,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};
use memory::Memory;
use cycle::Cycle;
use reasoning::Reasoner;
use std::sync::Arc;

fn create_inheritance_task(subject_name: &str, predicate_name: &str) -> Task {
    let subject = Arc::new(Term {
        name: subject_name.to_string(),
        term_type: TermType::Atom,
        complexity: 1,
        subject: None, predicate: None, components: None, embedding: None, created_at: 0, hash: subject_name.to_string(),
    });
    let predicate = Arc::new(Term {
        name: predicate_name.to_string(),
        term_type: TermType::Atom,
        complexity: 1,
        subject: None, predicate: None, components: None, embedding: None, created_at: 0, hash: predicate_name.to_string(),
    });

    let term = Term {
        name: format!("({} --> {})", subject_name, predicate_name),
        term_type: TermType::Inheritance,
        complexity: 3,
        subject: Some(subject),
        predicate: Some(predicate),
        components: None, embedding: None, created_at: 0, hash: "".to_string(),
    };

    Task {
        term,
        punctuation: Punctuation::Belief,
        truth: Some(TruthValue { frequency: 1.0, confidence: 0.9 }),
        priority: 1.0, accessed_at: 0, created_at: 0, occurrence_time: None, expiration_time: None, is_in_focus_set: false, derivation_path: None,
    }
}

fn main() {
    // 1. Initialize components
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // 2. Populate memory with knowledge
    println!("--- Populating Memory ---");
    memory.add_task(create_inheritance_task("cat", "mammal"));
    memory.add_task(create_inheritance_task("mammal", "animal"));
    memory.add_task(create_inheritance_task("dog", "mammal"));
    println!("Memory populated with 3 tasks.");

    // 3. Run the cognitive cycle
    let cycle = Cycle::new(&memory, &reasoner);
    cycle.run_cycle();
}