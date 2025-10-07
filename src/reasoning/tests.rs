use super::*;
use crate::data_structures::{
    punctuation::Punctuation,
    task::Task,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};
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

#[test]
fn test_deductive_inference() {
    let reasoner = Reasoner::new();
    let task1 = create_inheritance_task("cat", "mammal");
    let task2 = create_inheritance_task("mammal", "animal");
    let task3 = create_inheritance_task("bird", "animal"); // Unrelated task

    let focus_set = vec![&task1, &task2, &task3];
    let derived_tasks = reasoner.reason(&focus_set);

    assert_eq!(derived_tasks.len(), 1);
    let derived_task = &derived_tasks[0];
    assert_eq!(derived_task.term.name, "(cat --> animal)");
    assert_eq!(derived_task.term.term_type, TermType::Inheritance);
    assert_eq!(derived_task.truth.unwrap().confidence, 0.81);
}

#[test]
fn test_no_inference() {
    let reasoner = Reasoner::new();
    let task1 = create_inheritance_task("cat", "mammal");
    let task2 = create_inheritance_task("dog", "mammal");

    let focus_set = vec![&task1, &task2];
    let derived_tasks = reasoner.reason(&focus_set);
    assert!(derived_tasks.is_empty());
}