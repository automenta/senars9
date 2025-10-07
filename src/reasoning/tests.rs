use super::*;
use crate::{memory::Memory, parser};
use std::sync::Arc;

#[test]
fn test_deductive_syllogism_inference() {
    // Setup: Memory with (mammal --> animal).
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise2 = parser::parse("(mammal --> animal).").unwrap();
    memory.add_task(premise2);

    // Focus set with (cat --> mammal).
    let premise1 = Arc::new(parser::parse("(cat --> mammal).").unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived task.");
    let derived_task = &derived_tasks[0];
    let expected_term = parser::parse("(cat --> animal).").unwrap().term;
    assert_eq!(
        derived_task.term.hash, expected_term.hash,
        "Derived term is not the expected (cat --> animal)."
    );
}

#[test]
fn test_modus_ponens_inference() {
    // Setup: Memory with `raining.`
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise2 = parser::parse("raining.").unwrap();
    memory.add_task(premise2);

    // Focus set with `(raining ==> wet_streets).`
    let premise1 = Arc::new(parser::parse("(raining ==> wet_streets).").unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived task.");
    let derived_task = &derived_tasks[0];
    let expected_term = parser::parse("wet_streets.").unwrap().term;
    assert_eq!(
        derived_task.term.hash, expected_term.hash,
        "Derived term is not the expected wet_streets."
    );
}

#[test]
fn test_no_inference_when_premise_is_missing() {
    // Setup: Empty memory
    let memory = Memory::new();
    let reasoner = Reasoner::new();

    // Focus set with (cat --> mammal).
    let premise1 = Arc::new(parser::parse("(cat --> mammal).").unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &memory);

    // Verification
    assert!(
        derived_tasks.is_empty(),
        "No tasks should be derived when the second premise is missing."
    );
}