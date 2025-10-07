use super::*;
use crate::data_structures::{
    punctuation::Punctuation,
    task::Task,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};
use crate::memory::Memory;
use crate::reasoning::Reasoner;

fn create_dummy_task(name: &str) -> Task {
    Task {
        term: Term {
            name: name.to_string(),
            term_type: TermType::Atom,
            complexity: 1,
            subject: None,
            predicate: None,
            components: None,
            embedding: None,
            created_at: 0,
            hash: name.to_string(),
        },
        punctuation: Punctuation::Belief,
        truth: Some(TruthValue {
            frequency: 1.0,
            confidence: 0.9,
        }),
        priority: 0.5,
        accessed_at: 0,
        created_at: 0,
        occurrence_time: None,
        expiration_time: None,
        is_in_focus_set: false,
        derivation_path: None,
    }
}

#[test]
fn test_new_cycle() {
    let memory = Memory::new();
    let reasoner = Reasoner::new();
    let cycle = Cycle::new(&memory, &reasoner);
    assert_eq!(cycle.select_focus_set().len(), 0);
}

#[test]
fn test_select_focus_set_less_than_max() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    memory.add_task(create_dummy_task("task1"));
    memory.add_task(create_dummy_task("task2"));

    let cycle = Cycle::new(&memory, &reasoner);
    let focus_set = cycle.select_focus_set();
    assert_eq!(focus_set.len(), 2);
}

#[test]
fn test_select_focus_set_more_than_max() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    for i in 0..10 {
        memory.add_task(create_dummy_task(&format!("task{}", i)));
    }

    let cycle = Cycle::new(&memory, &reasoner);
    let focus_set = cycle.select_focus_set();
    assert_eq!(focus_set.len(), FOCUS_SET_SIZE);
}

#[test]
fn test_run_cycle_does_not_panic() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    memory.add_task(create_dummy_task("task1"));
    let cycle = Cycle::new(&memory, &reasoner);
    cycle.run_cycle(); // This should just run without panicking
}