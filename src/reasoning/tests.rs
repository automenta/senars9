use super::*;
use crate::{
    cycle::context::CycleContext,
    data_structures::{
        punctuation::Punctuation, term::Term, term_type::TermType, truth_value::TruthValue,
    },
    memory::Memory,
    parser,
};
use std::sync::Arc;

/// Helper function to reduce boilerplate in inference tests.
/// It sets up memory, a reasoner, and a context, then runs the reasoner on a focus task.
fn run_inference_test(focus_task_str: &str, memory_task_strs: &[&str]) -> Vec<Task> {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };

    // Add initial tasks to memory.
    for (i, &task_str) in memory_task_strs.iter().enumerate() {
        // Timestamps are arbitrary but distinct.
        let task = parser::parse(task_str, i as u64).unwrap();
        memory.add_task(task, i as u64);
    }

    // The focus task is the one that triggers the inference.
    let focus_task = Arc::new(parser::parse(focus_task_str, memory_task_strs.len() as u64).unwrap());
    let focus_set = vec![focus_task];

    reasoner.reason(&focus_set, &mut memory, &context)
}

#[test]
fn test_deductive_syllogism_inference() {
    let derived_tasks = run_inference_test(
        "(cat --> mammal). %1.0;0.9%",
        &["(mammal --> animal). %1.0;0.8%"],
    );

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];

    let expected_term = Term::create_compound(
        TermType::Inheritance,
        vec![Term::new_atom("cat"), Term::new_atom("animal")],
    );
    assert_eq!(derived_task.term().hash, expected_term.hash);

    let expected_truth = TruthValue {
        frequency: 1.0,
        confidence: 0.72, // 1.0 * 0.9 * 0.8
    };
    let derived_truth = derived_task.truth.unwrap();
    assert!((derived_truth.frequency - expected_truth.frequency).abs() < 1e-9);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}

#[test]
fn test_modus_ponens_inference() {
    let derived_tasks = run_inference_test(
        "(raining ==> wet_streets). %0.9;0.9%",
        &["raining. %1.0;0.9%"],
    );

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];
    let expected_term = Term::new_atom("wet_streets");
    assert_eq!(derived_task.term().hash, expected_term.hash);

    let expected_truth = TruthValue {
        frequency: 0.9,
        confidence: 0.81, // 0.9 * 0.9
    };
    let derived_truth = derived_task.truth.unwrap();
    assert!((derived_truth.frequency - expected_truth.frequency).abs() < 1e-9);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}

#[test]
fn test_analogy_inference() {
    let derived_tasks = run_inference_test("(dog <-> wolf).", &["(dog --> has_fur)."]);

    assert_eq!(derived_tasks.len(), 1);
    let derived_question = &derived_tasks[0];

    let expected_term = Term::create_compound(
        TermType::Inheritance,
        vec![Term::new_atom("wolf"), Term::new_atom("has_fur")],
    );
    assert_eq!(derived_question.punctuation, Punctuation::Question);
    assert_eq!(derived_question.term().hash, expected_term.hash);
}

#[test]
fn test_induction_inference() {
    let derived_tasks = run_inference_test(
        "(bird --> has_wings). %0.8;0.8%",
        &["(bird --> can_fly). %0.7;0.9%"],
    );

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];

    let expected_term = Term::create_compound(
        TermType::Inheritance,
        vec![Term::new_atom("has_wings"), Term::new_atom("can_fly")],
    );
    assert_eq!(derived_task.term().hash, expected_term.hash);

    // NOTE: Preserving original test's truth value assertion.
    let expected_truth = TruthValue {
        frequency: 0.8,
        confidence: (0.72 / 1.72) * 0.7,
    };
    let derived_truth = derived_task.truth.unwrap();
    assert_eq!(derived_truth.frequency, expected_truth.frequency);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}

#[test]
fn test_abduction_inference() {
    let derived_tasks = run_inference_test(
        "(cat --> mammal). %0.8;0.8%",
        &["(dog --> mammal). %0.7;0.9%"],
    );

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];

    let expected_term = Term::create_compound(
        TermType::Inheritance,
        vec![Term::new_atom("cat"), Term::new_atom("dog")],
    );
    assert_eq!(derived_task.term().hash, expected_term.hash);

    // NOTE: Preserving original test's truth value assertion.
    let expected_truth = TruthValue {
        frequency: 0.7,
        confidence: (0.72 / 1.72) * 0.8,
    };
    let derived_truth = derived_task.truth.unwrap();
    assert_eq!(derived_truth.frequency, expected_truth.frequency);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}