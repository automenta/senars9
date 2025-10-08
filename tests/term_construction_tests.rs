// tests/term_construction_tests.rs

use app::data_structures::{term::Term, term_type::TermType};
use std::sync::Arc;

#[test]
fn test_atomic_term_construction() {
    let atom = Term::new_atom("test_atom");
    assert_eq!(atom.name, "test_atom");
    assert_eq!(atom.term_type, TermType::Atom);
    assert_eq!(atom.complexity, 1);
    assert!(atom.components.is_none());
}

#[test]
fn test_compound_term_construction_and_formatting() {
    let cat = Arc::new(Term::new_atom("cat"));
    let mammal = Arc::new(Term::new_atom("mammal"));
    let dog = Arc::new(Term::new_atom("dog"));
    let wolf = Arc::new(Term::new_atom("wolf"));
    let premise = Arc::new(Term::new_atom("premise"));
    let conclusion = Arc::new(Term::new_atom("conclusion"));
    let feline = Arc::new(Term::new_atom("feline"));
    let furry = Arc::new(Term::new_atom("furry"));
    let pet = Arc::new(Term::new_atom("pet"));
    let clean = Arc::new(Term::new_atom("clean"));
    let dirty_room = Arc::new(Term::new_atom("dirty_room"));
    let function = Arc::new(Term::new_atom("function"));
    let arguments = Arc::new(Term::new_atom("arguments"));
    let fluffy = Arc::new(Term::new_atom("fluffy"));
    let bird = Arc::new(Term::new_atom("bird"));

    // Core Relationship Operators
    let inheritance = Term::create_compound(TermType::Inheritance, vec![cat.clone(), mammal.clone()]);
    assert_eq!(inheritance.name, "(cat --> mammal)");

    let similarity = Term::create_compound(TermType::Similarity, vec![dog.clone(), wolf.clone()]);
    assert_eq!(similarity.name, "(dog <-> wolf)");

    let implication = Term::create_compound(TermType::Implication, vec![premise.clone(), conclusion.clone()]);
    assert_eq!(implication.name, "(premise ==> conclusion)");

    let equivalence = Term::create_compound(TermType::Equivalence, vec![cat.clone(), feline.clone()]);
    assert_eq!(equivalence.name, "(cat <=> feline)");

    let conjunction = Term::create_compound(TermType::Conjunction, vec![cat.clone(), furry.clone()]);
    assert_eq!(conjunction.name, "(&, cat, furry)");

    let disjunction = Term::create_compound(TermType::Disjunction, vec![cat.clone(), dog.clone()]);
    assert_eq!(disjunction.name, "(|, cat, dog)");

    let negation = Term::create_compound(TermType::Negation, vec![cat.clone()]);
    assert_eq!(negation.name, "(--, cat)");

    let sequential_conjunction = Term::create_compound(TermType::SequentialConjunction, vec![clean.clone(), dirty_room.clone()]);
    assert_eq!(sequential_conjunction.name, "(&/, clean, dirty_room)");

    let operation = Term::create_compound(TermType::Operation, vec![function.clone(), arguments.clone()]);
    assert_eq!(operation.name, "(function ^ arguments)");

    let product = Term::create_compound(TermType::Product, vec![cat.clone(), dog.clone(), bird.clone()]);
    assert_eq!(product.name, "(cat, dog, bird)");

    // Set and Property Operators
    let instance = Term::create_compound(TermType::Instance, vec![fluffy.clone(), cat.clone()]);
    assert_eq!(instance.name, "(fluffy {-- cat)");

    let property = Term::create_compound(TermType::Property, vec![cat.clone(), furry.clone()]);
    assert_eq!(property.name, "(cat --} furry)");

    let extensional_set = Term::create_compound(TermType::ExtensionalSet, vec![cat.clone(), dog.clone(), bird.clone()]);
    assert_eq!(extensional_set.name, "{cat, dog, bird}");

    let intensional_set = Term::create_compound(TermType::IntensionalSet, vec![furry.clone(), pet.clone()]);
    assert_eq!(intensional_set.name, "[furry, pet]");
}