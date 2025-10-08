use serde::{Deserialize, Serialize};

/// Represents the type of a term.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TermType {
    // Core Relationship Operators
    Negation,
    Product,
    Inheritance,
    Similarity,
    Implication,
    Equivalence,
    Conjunction,
    Disjunction,
    SequentialConjunction,
    Operation,

    // Set and Property Operators
    Instance,
    Property,
    ExtensionalSet,
    IntensionalSet,

    // Atomic term
    Atom,
}