use super::*;
use crate::{
    cycle::context::CycleContext,
    data_structures::{punctuation::Punctuation, term_type::TermType, truth_value::TruthValue},
    memory::Memory,
    parser,
};
use std::sync::Arc;

#[test]
fn test_deductive_syllogism_inference() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };

    let premise2 = parser::parse("(mammal --> animal). %1.0;0.8%", 1).unwrap();
    memory.add_task(premise2, 1);
    let premise1 = Arc::new(parser::parse("(cat --> mammal). %1.0;0.9%", 2).unwrap());
    let focus_set = vec![premise1];

    let derived_tasks = reasoner.reason(&focus_set, &mut memory, &context);

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];

    // Create concepts separately to avoid borrow checker errors
    let cat_concept = memory.create_or_get_atom_concept("cat", 0);
    let animal_concept = memory.create_or_get_atom_concept("animal", 0);
    let expected_concept = memory
        .create_or_get_compound_concept(TermType::Inheritance, vec![cat_concept, animal_concept], 0);

    assert_eq!(derived_task.term().hash, expected_concept.term.hash);
    let expected_truth = TruthValue {
        frequency: 1.0,
        confidence: 0.72,
    };
    let derived_truth = derived_task.truth.unwrap();
    assert_eq!(derived_truth.frequency, expected_truth.frequency);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}

#[test]
fn test_modus_ponens_inference() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };
    let premise2 = parser::parse("raining. %1.0;0.9%", 1).unwrap();
    memory.add_task(premise2, 1);
    let premise1 = Arc::new(parser::parse("(raining ==> wet_streets). %0.9;0.9%", 2).unwrap());
    let focus_set = vec![premise1];
    let derived_tasks = reasoner.reason(&focus_set, &mut memory, &context);

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];
    let expected_concept = memory.create_or_get_atom_concept("wet_streets", 0);
    assert_eq!(derived_task.term().hash, expected_concept.term.hash);

    let expected_truth = TruthValue {
        frequency: 0.9,
        confidence: 0.81,
    };
    let derived_truth = derived_task.truth.unwrap();
    assert_eq!(derived_truth.frequency, expected_truth.frequency);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}

#[test]
fn test_analogy_inference() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };
    let premise2 = parser::parse("(dog --> has_fur).", 1).unwrap();
    memory.add_task(premise2, 1);
    let premise1 = Arc::new(parser::parse("(dog <-> wolf).", 2).unwrap());
    let focus_set = vec![premise1];
    let derived_tasks = reasoner.reason(&focus_set, &mut memory, &context);

    assert_eq!(derived_tasks.len(), 1);
    let derived_question = &derived_tasks[0];

    let wolf_concept = memory.create_or_get_atom_concept("wolf", 0);
    let has_fur_concept = memory.create_or_get_atom_concept("has_fur", 0);
    let expected_concept = memory
        .create_or_get_compound_concept(TermType::Inheritance, vec![wolf_concept, has_fur_concept], 0);

    assert_eq!(derived_question.punctuation, Punctuation::Question);
    assert_eq!(derived_question.term().hash, expected_concept.term.hash);
}

#[test]
fn test_induction_inference() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };
    let premise2 = parser::parse("(bird --> can_fly). %0.7;0.9%", 1).unwrap();
    memory.add_task(premise2, 1);
    let premise1 = Arc::new(parser::parse("(bird --> has_wings). %0.8;0.8%", 2).unwrap());
    let focus_set = vec![premise1];
    let derived_tasks = reasoner.reason(&focus_set, &mut memory, &context);

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];

    let has_wings_concept = memory.create_or_get_atom_concept("has_wings", 0);
    let can_fly_concept = memory.create_or_get_atom_concept("can_fly", 0);
    let expected_concept = memory.create_or_get_compound_concept(
        TermType::Inheritance,
        vec![has_wings_concept, can_fly_concept],
        0,
    );

    assert_eq!(derived_task.term().hash, expected_concept.term.hash);
    let expected_c = (0.72 / 1.72) * 0.7;
    let expected_truth = TruthValue {
        frequency: 0.8,
        confidence: expected_c,
    };
    let derived_truth = derived_task.truth.unwrap();
    assert_eq!(derived_truth.frequency, expected_truth.frequency);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}

#[test]
fn test_abduction_inference() {
    let mut memory = Memory::new();
    let reasoner = Reasoner::new();
    let context = CycleContext { current_time: 100 };
    let premise2 = parser::parse("(dog --> mammal). %0.7;0.9%", 1).unwrap();
    memory.add_task(premise2, 1);
    let premise1 = Arc::new(parser::parse("(cat --> mammal). %0.8;0.8%", 2).unwrap());
    let focus_set = vec![premise1];
    let derived_tasks = reasoner.reason(&focus_set, &mut memory, &context);

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];

    let cat_concept = memory.create_or_get_atom_concept("cat", 0);
    let dog_concept = memory.create_or_get_atom_concept("dog", 0);
    let expected_concept = memory
        .create_or_get_compound_concept(TermType::Inheritance, vec![cat_concept, dog_concept], 0);

    assert_eq!(derived_task.term().hash, expected_concept.term.hash);
    let expected_c = (0.72 / 1.72) * 0.8;
    let expected_truth = TruthValue {
        frequency: 0.7,
        confidence: expected_c,
    };
    let derived_truth = derived_task.truth.unwrap();
    assert_eq!(derived_truth.frequency, expected_truth.frequency);
    assert!((derived_truth.confidence - expected_truth.confidence).abs() < 1e-9);
}