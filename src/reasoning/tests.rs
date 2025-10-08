use super::*;
use crate::{
    data_structures::{punctuation::Punctuation, truth_value::TruthValue},
    memory::Memory,
    parser,
};
use std::sync::Arc;

#[test]
fn test_deductive_syllogism_inference() {
    // Setup: Memory with (mammal --> animal).
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise2 = parser::parse("(mammal --> animal). %1.0;0.8%", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with (cat --> mammal).
    let premise1 = Arc::new(parser::parse("(cat --> mammal). %1.0;0.9%", &mut memory).unwrap());
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

    // Verify the calculated truth value.
    // f = 1.0 * 1.0 = 1.0
    // c = 1.0 * 1.0 * 0.9 * 0.8 = 0.72
    let expected_truth = TruthValue {
        frequency: 1.0,
        confidence: 0.72,
    };
    let derived_truth = derived_task
        .truth
        .expect("Derived task should have a truth value.");
    assert_eq!(
        derived_truth.frequency,
        expected_truth.frequency,
        "Frequency is incorrect."
    );
    assert!(
        (derived_truth.confidence - expected_truth.confidence).abs() < 1e-9,
        "Confidence is incorrect. Expected: {}, Got: {}",
        expected_truth.confidence,
        derived_truth.confidence
    );
}

#[test]
fn test_modus_ponens_inference() {
    // Setup: Memory with `raining.`
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    // Premise 2: A is true.
    let premise2 = parser::parse("raining. %1.0;0.9%", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with `(raining ==> wet_streets).`
    // Premise 1: (A ==> B) is true.
    let premise1 =
        Arc::new(parser::parse("(raining ==> wet_streets). %0.9;0.9%", &mut memory).unwrap());
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

    // Verify the calculated truth value.
    // P1 (antecedent): <f1=1.0, c1=0.9>
    // P2 (implication): <f2=0.9, c2=0.9>
    // F = f2 = 0.9
    // C = (c1 * c2) * f1 = (0.9 * 0.9) * 1.0 = 0.81
    let expected_truth = TruthValue {
        frequency: 0.9,
        confidence: 0.81,
    };
    let derived_truth = derived_task
        .truth
        .expect("Derived task should have a truth value.");
    assert_eq!(
        derived_truth.frequency,
        expected_truth.frequency,
        "Frequency is incorrect."
    );
    assert!(
        (derived_truth.confidence - expected_truth.confidence).abs() < 1e-9,
        "Confidence is incorrect. Expected: {}, Got: {}",
        expected_truth.confidence,
        derived_truth.confidence
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

#[test]
fn test_induction_inference() {
    // Setup: Memory with (bird --> can_fly).
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise2 = parser::parse("(bird --> can_fly). %0.7;0.9%", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with (bird --> has_wings).
    let premise1 = Arc::new(parser::parse("(bird --> has_wings). %0.8;0.8%", &mut memory).unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &mut memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived task.");
    let derived_task = &derived_tasks[0];
    let expected_term = parser::parse("(has_wings --> can_fly).", &mut memory)
        .unwrap()
        .term;
    assert_eq!(
        derived_task.term.hash, expected_term.hash,
        "Derived term is not the expected (has_wings --> can_fly)."
    );

    // Verify the calculated truth value.
    // P1(M->S): <f1=0.8, c1=0.8>
    // P2(M->P): <f2=0.7, c2=0.9>
    // F = f1 = 0.8
    // C = weak(c1 * c2) * f2 = weak(0.8 * 0.9) * 0.7 = (0.72 / 1.72) * 0.7
    let expected_c = (0.72 / 1.72) * 0.7;
    let expected_truth = TruthValue {
        frequency: 0.8,
        confidence: expected_c,
    };
    let derived_truth = derived_task
        .truth
        .expect("Derived task should have a truth value.");
    assert_eq!(
        derived_truth.frequency,
        expected_truth.frequency,
        "Frequency is incorrect."
    );
    assert!(
        (derived_truth.confidence - expected_truth.confidence).abs() < 1e-9,
        "Confidence is incorrect. Expected: {}, Got: {}",
        expected_truth.confidence,
        derived_truth.confidence
    );
}

#[test]
fn test_abduction_inference() {
    // Setup: Memory with (dog --> mammal).
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let premise2 = parser::parse("(dog --> mammal). %0.7;0.9%", &mut memory).unwrap();
    memory.add_task(premise2);

    // Focus set with (cat --> mammal).
    let premise1 = Arc::new(parser::parse("(cat --> mammal). %0.8;0.8%", &mut memory).unwrap());
    let focus_set = vec![premise1];

    // Run reasoning
    let derived_tasks = reasoner.reason(&focus_set, &mut memory);

    // Verification
    assert_eq!(derived_tasks.len(), 1, "Expected exactly one derived task.");
    let derived_task = &derived_tasks[0];
    let expected_term = parser::parse("(cat --> dog).", &mut memory).unwrap().term;
    assert_eq!(
        derived_task.term.hash, expected_term.hash,
        "Derived term is not the expected (cat --> dog)."
    );

    // Verify the calculated truth value.
    // P1(S->M): <f1=0.8, c1=0.8>
    // P2(P->M): <f2=0.7, c2=0.9>
    // F = f2 = 0.7
    // C = weak(c1 * c2) * f1 = weak(0.8 * 0.9) * 0.8 = (0.72 / 1.72) * 0.8
    let expected_c = (0.72 / 1.72) * 0.8;
    let expected_truth = TruthValue {
        frequency: 0.7,
        confidence: expected_c,
    };
    let derived_truth = derived_task
        .truth
        .expect("Derived task should have a truth value.");
    assert_eq!(
        derived_truth.frequency,
        expected_truth.frequency,
        "Frequency is incorrect."
    );
    assert!(
        (derived_truth.confidence - expected_truth.confidence).abs() < 1e-9,
        "Confidence is incorrect. Expected: {}, Got: {}",
        expected_truth.confidence,
        derived_truth.confidence
    );
}