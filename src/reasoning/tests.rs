use super::*;
use crate::{memory::Memory, parser, data_structures::punctuation::Punctuation};
use std::sync::Arc;

#[test]
fn test_deductive_syllogism_inference() {
    // Setup: Memory with (mammal --> animal).
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise2 = parser::parse("(mammal --> animal).", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with (cat --> mammal).
    let premise1 = Arc::new(parser::parse("(cat --> mammal).", &mut memory).unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &mut memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived task.");
    let derived_task = &derived_tasks[0];
    let expected_term = parser::parse("(cat --> animal).", &mut memory).unwrap().term;
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
    let premise2 = parser::parse("raining.", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with `(raining ==> wet_streets).`
    let premise1 = Arc::new(parser::parse("(raining ==> wet_streets).", &mut memory).unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &mut memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived task.");
    let derived_task = &derived_tasks[0];
    let expected_term = parser::parse("wet_streets.", &mut memory).unwrap().term;
    assert_eq!(
        derived_task.term.hash, expected_term.hash,
        "Derived term is not the expected wet_streets."
    );
}

#[test]
fn test_no_inference_when_premise_is_missing() {
    // Setup: Empty memory
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();

    // Focus set with (cat --> mammal).
    let premise1 = Arc::new(parser::parse("(cat --> mammal).", &mut memory).unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &mut memory);

    // Verification
    assert!(
        derived_tasks.is_empty(),
        "No tasks should be derived when the second premise is missing."
    );
}

#[test]
fn test_analogy_inference() {
    // Setup: Memory with (dog <-> wolf). and (dog --> has_fur).
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise1 = parser::parse("(dog <-> wolf).", &mut memory).unwrap();
    let premise2 = parser::parse("(dog --> has_fur).", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with the similarity task
    let focus_task = Arc::new(premise1);
    let focus_set = vec![focus_task];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &mut memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived question.");
    let derived_question = &derived_tasks[0];
    let expected_term = parser::parse("(wolf --> has_fur)?", &mut memory).unwrap().term;

    assert_eq!(derived_question.punctuation, Punctuation::Question, "Derived task should be a question.");
    assert_eq!(
        derived_question.term.hash, expected_term.hash,
        "Derived question is not the expected (wolf --> has_fur)?"
    );
}