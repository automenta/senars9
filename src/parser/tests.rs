use crate::data_structures::{punctuation::Punctuation, term_type::TermType};
use crate::memory::Memory;
use crate::parser::parse;

#[test]
fn test_parse_atom_belief() {
    let mut memory = Memory::new();
    let task = parse("my_atom.", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Belief);
    assert_eq!(task.term.term_type, TermType::Atom);
    assert_eq!(task.term.name, "my_atom");
    assert!(task.truth.is_none());
}

#[test]
fn test_parse_atom_question() {
    let mut memory = Memory::new();
    let task = parse("my_atom?", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Question);
    assert_eq!(task.term.name, "my_atom");
}

#[test]
fn test_parse_atom_goal() {
    let mut memory = Memory::new();
    let task = parse("my_goal!", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Goal);
    assert_eq!(task.term.name, "my_goal");
}

#[test]
fn test_parse_inheritance_with_truth() {
    let mut memory = Memory::new();
    let task = parse("(cat --> mammal). %1.0;0.9%", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Belief);
    assert_eq!(task.term.term_type, TermType::Inheritance);
    assert_eq!(task.term.subject.as_ref().unwrap().name, "cat");
    assert_eq!(task.term.predicate.as_ref().unwrap().name, "mammal");
    let truth = task.truth.unwrap();
    assert_eq!(truth.frequency, 1.0);
    assert_eq!(truth.confidence, 0.9);
}

#[test]
fn test_parse_implication_question() {
    let mut memory = Memory::new();
    let task = parse("(raining ==> wet_streets)?", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Question);
    assert_eq!(task.term.term_type, TermType::Implication);
}

#[test]
fn test_parse_conjunction() {
    let mut memory = Memory::new();
    let task = parse("(&, cat, furry, pet)!", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Goal);
    assert_eq!(task.term.term_type, TermType::Conjunction);
    let components = task.term.components.as_ref().unwrap();
    let names: Vec<_> = components.iter().map(|c| c.name.as_str()).collect();
    assert_eq!(names.len(), 3);
    assert!(names.contains(&"cat"));
    assert!(names.contains(&"furry"));
    assert!(names.contains(&"pet"));
}

#[test]
fn test_parse_nested_term() {
    let mut memory = Memory::new();
    let task = parse("(&/, (add ^ (1, 2)), (is_even ==> true)). %0.5;0.75%", &mut memory).unwrap();
    let term = task.term;
    assert_eq!(term.term_type, TermType::SequentialConjunction);

    let subject = term.subject.as_ref().unwrap();
    assert_eq!(subject.term_type, TermType::Operation);
    assert_eq!(subject.name, "(add ^ (1, 2))");

    let predicate = term.predicate.as_ref().unwrap();
    assert_eq!(predicate.term_type, TermType::Implication);
    assert_eq!(predicate.name, "(is_even ==> true)");

    let truth = task.truth.unwrap();
    assert_eq!(truth.frequency, 0.5);
    assert_eq!(truth.confidence, 0.75);
}

#[test]
fn test_invalid_statement() {
    let mut memory = Memory::new();
    // Invalid term structure
    assert!(parse("(cat -> mammal).", &mut memory).is_err());
    // Missing punctuation
    assert!(parse("(cat --> mammal)", &mut memory).is_err());
    // Truth value on a question
    assert!(parse("(cat --> mammal)? %1.0;0.9%", &mut memory).is_err());
    // Incomplete truth value
    assert!(parse("(cat --> mammal). %1.0;%", &mut memory).is_err());
}

#[test]
fn test_parse_similarity() {
    let mut memory = Memory::new();
    let task = parse("(dog <-> wolf)?", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Question);
    assert_eq!(task.term.term_type, TermType::Similarity);
    assert_eq!(task.term.subject.as_ref().unwrap().name, "dog");
    assert_eq!(task.term.predicate.as_ref().unwrap().name, "wolf");
}

#[test]
fn test_parse_equivalence() {
    let mut memory = Memory::new();
    let task = parse("(cat <=> feline).", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Belief);
    assert_eq!(task.term.term_type, TermType::Equivalence);
}

#[test]
fn test_parse_disjunction() {
    let mut memory = Memory::new();
    let task = parse("(|, cat, dog, bird)!", &mut memory).unwrap();
    assert_eq!(task.punctuation, Punctuation::Goal);
    assert_eq!(task.term.term_type, TermType::Disjunction);
    let components = task.term.components.as_ref().unwrap();
    assert_eq!(components.len(), 3);
}

#[test]
fn test_parse_negation() {
    let mut memory = Memory::new();
    let task = parse("(--, (cat --> bird)).", &mut memory).unwrap();
    assert_eq!(task.term.term_type, TermType::Negation);
    let inner_term = &task.term.components.as_ref().unwrap()[0];
    assert_eq!(inner_term.term_type, TermType::Inheritance);
    assert_eq!(inner_term.name, "(cat --> bird)");
}

#[test]
fn test_parse_product() {
    let mut memory = Memory::new();
    let task = parse("(a, b, c)?", &mut memory).unwrap();
    assert_eq!(task.term.term_type, TermType::Product);
}

#[test]
fn test_parse_instance() {
    let mut memory = Memory::new();
    let task = parse("(fluffy {-- cat).", &mut memory).unwrap();
    assert_eq!(task.term.term_type, TermType::Instance);
}

#[test]
fn test_parse_property() {
    let mut memory = Memory::new();
    let task = parse("(cat --} furry).", &mut memory).unwrap();
    assert_eq!(task.term.term_type, TermType::Property);
}

#[test]
fn test_parse_extensional_set() {
    let mut memory = Memory::new();
    let task = parse("{cat, dog, bird}.", &mut memory).unwrap();
    assert_eq!(task.term.term_type, TermType::ExtensionalSet);
    let components = task.term.components.as_ref().unwrap();
    assert_eq!(components.len(), 3);
}

#[test]
fn test_parse_intensional_set() {
    let mut memory = Memory::new();
    let task = parse("[furry, pet, mammal].", &mut memory).unwrap();
    assert_eq!(task.term.term_type, TermType::IntensionalSet);
    let components = task.term.components.as_ref().unwrap();
    assert_eq!(components.len(), 3);
}