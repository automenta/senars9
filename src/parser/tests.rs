use crate::parser::parse_term;
use crate::data_structures::term_type::TermType;

#[test]
fn test_parse_atom() {
    let term = parse_term("my_atom").unwrap();
    assert_eq!(term.term_type, TermType::Atom);
    assert_eq!(term.name, "my_atom");
}

#[test]
fn test_parse_inheritance() {
    let term = parse_term("(cat --> mammal)").unwrap();
    assert_eq!(term.term_type, TermType::Inheritance);
    assert_eq!(term.subject.unwrap().name, "cat");
    assert_eq!(term.predicate.unwrap().name, "mammal");
}

#[test]
fn test_parse_negation() {
    let term = parse_term("(--, (cat --> bird))").unwrap();
    assert_eq!(term.term_type, TermType::Negation);
    let inner_term = term.subject.unwrap();
    assert_eq!(inner_term.name, "(cat --> bird)");
    assert_eq!(inner_term.term_type, TermType::Inheritance);
}

#[test]
fn test_parse_conjunction() {
    let term = parse_term("(&, cat, furry, pet)").unwrap();
    assert_eq!(term.term_type, TermType::Conjunction);
    let components = term.components.unwrap();
    assert_eq!(components.len(), 3);
    assert_eq!(components[0].name, "cat");
    assert_eq!(components[1].name, "furry");
    assert_eq!(components[2].name, "pet");
}

#[test]
fn test_parse_disjunction() {
    let term = parse_term("(|, cat, dog, bird)").unwrap();
    assert_eq!(term.term_type, TermType::Disjunction);
    let components = term.components.unwrap();
    assert_eq!(components.len(), 3);
    assert_eq!(components[0].name, "cat");
}

#[test]
fn test_parse_implication() {
    let term = parse_term("(raining ==> wet_streets)").unwrap();
    assert_eq!(term.term_type, TermType::Implication);
    assert_eq!(term.subject.unwrap().name, "raining");
    assert_eq!(term.predicate.unwrap().name, "wet_streets");
}

#[test]
fn test_parse_equivalence() {
    let term = parse_term("(cat <=> feline)").unwrap();
    assert_eq!(term.term_type, TermType::Equivalence);
    assert_eq!(term.subject.unwrap().name, "cat");
    assert_eq!(term.predicate.unwrap().name, "feline");
}

#[test]
fn test_parse_similarity() {
    let term = parse_term("(dog <-> wolf)").unwrap();
    assert_eq!(term.term_type, TermType::Similarity);
}

#[test]
fn test_parse_product() {
    let term = parse_term("(x, y)").unwrap();
    assert_eq!(term.term_type, TermType::Product);
}

#[test]
fn test_parse_sequential_conjunction() {
    let term = parse_term("(&/, clean, dirty_room)").unwrap();
    assert_eq!(term.term_type, TermType::SequentialConjunction);
}

#[test]
fn test_parse_operation() {
    let term = parse_term("(add ^ (1, 2))").unwrap();
    assert_eq!(term.term_type, TermType::Operation);
    assert_eq!(term.subject.unwrap().name, "add");
    let predicate = term.predicate.unwrap();
    assert_eq!(predicate.name, "(1, 2)");
    assert_eq!(predicate.term_type, TermType::Product);
}

#[test]
fn test_parse_instance() {
    let term = parse_term("(fluffy {-- cat)").unwrap();
    assert_eq!(term.term_type, TermType::Instance);
}

#[test]
fn test_parse_property() {
    let term = parse_term("(cat --} furry)").unwrap();
    assert_eq!(term.term_type, TermType::Property);
}

#[test]
fn test_parse_extensional_set() {
    let term = parse_term("{cat, dog, bird}").unwrap();
    assert_eq!(term.term_type, TermType::ExtensionalSet);
    let components = term.components.unwrap();
    assert_eq!(components.len(), 3);
}

#[test]
fn test_parse_intensional_set() {
    let term = parse_term("[furry, pet, mammal]").unwrap();
    assert_eq!(term.term_type, TermType::IntensionalSet);
    let components = term.components.unwrap();
    assert_eq!(components.len(), 3);
}

#[test]
fn test_parse_nested_term() {
    let term = parse_term("(&/, (add ^ (1, 2)), (is_even ==> true))").unwrap();
    assert_eq!(term.term_type, TermType::SequentialConjunction);

    let subject = term.subject.unwrap();
    assert_eq!(subject.term_type, TermType::Operation);
    assert_eq!(subject.name, "(add ^ (1, 2))");

    let predicate = term.predicate.unwrap();
    assert_eq!(predicate.term_type, TermType::Implication);
    assert_eq!(predicate.name, "(is_even ==> true)");
}

#[test]
fn test_invalid_term() {
    assert!(parse_term("(cat -> mammal)").is_err());
    assert!(parse_term("(&, a, b, )").is_err());
    assert!(parse_term("cat --> mammal").is_err());
}