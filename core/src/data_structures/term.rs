use super::{term_simplification, term_type::TermType};
use crate::parser;
use serde::Deserialize;
use std::collections::hash_map::DefaultHasher;
use std::fmt;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

/// Represents a term in the SeNARS system, the fundamental unit of knowledge.
///
/// `Term` is designed to be immutable, with its identity defined by its content hash.
/// This allows for efficient storage and retrieval in memory.
///
/// # Serialization
/// `Term` uses custom `Serialize` and `Deserialize` implementations.
/// - It serializes into its Narsese string representation (e.g., `"(A --> B)"`).
/// - It deserializes from this string back into a canonical, shared `Arc<Term>`,
///   re-using the system's parser to ensure invariants are maintained.
#[derive(Debug, Clone)]
pub struct Term {
    /// The name of the term, which also serves as its string representation in Narsese.
    pub name: String,
    /// The type of the term (e.g., Atom, Inheritance).
    pub term_type: TermType,
    /// The complexity of the term, calculated based on its components.
    pub complexity: u64,
    /// The subject of a compound term (e.g., in `(A --> B)`, `A` is the subject).
    pub subject: Option<Arc<Term>>,
    /// The predicate of a compound term (e.g., in `(A --> B)`, `B` is the predicate).
    pub predicate: Option<Arc<Term>>,
    /// The components of a compound term.
    pub components: Option<Vec<Arc<Term>>>,
    /// A unique hash identifying the term's content, used for equality checks and hashing.
    pub hash: String,
}

impl Term {
    /// Computes a SHA256 hash for the term's identifying components.
    pub fn compute_hash(name: &str, term_type: &TermType, components: &Option<Vec<Arc<Term>>>) -> String {
        let mut hasher = DefaultHasher::new();
        name.hash(&mut hasher);
        term_type.hash(&mut hasher);
        if let Some(comps) = components {
            for component in comps {
                component.hash.hash(&mut hasher);
            }
        }
        format!("{:x}", hasher.finish())
    }

    /// Computes a hash for an atomic term, used for quick lookups.
    pub fn compute_hash_for_atom(name: &str) -> String {
        let term_type = TermType::Atom;
        Term::compute_hash(name, &term_type, &None)
    }

    /// Generates a name for a compound term based on its type and components.
    /// This is the standard Narsese representation, as defined in `SPECIFICATION.md`.
    pub fn generate_name(term_type: &TermType, components: &[Arc<Term>]) -> String {
        let component_names: Vec<String> = components.iter().map(|c| c.name.clone()).collect();
        match term_type {
            // Core Relationship Operators
            TermType::Negation => format!("(--, {})", component_names[0]),
            TermType::Inheritance => format!("({} --> {})", component_names[0], component_names[1]),
            TermType::Similarity => format!("({} <-> {})", component_names[0], component_names[1]),
            TermType::Implication => format!("({} ==> {})", component_names[0], component_names[1]),
            TermType::Equivalence => format!("({} <=> {})", component_names[0], component_names[1]),
            TermType::Conjunction => format!("(&, {})", component_names.join(", ")),
            TermType::Disjunction => format!("(|, {})", component_names.join(", ")),
            TermType::SequentialConjunction => format!("(&/, {}, {})", component_names[0], component_names[1]),
            TermType::Operation => format!("({} ^ {})", component_names[0], component_names[1]),
            TermType::Product => format!("({})", component_names.join(", ")),

            // Set and Property Operators
            TermType::Instance => format!("({} {{-- {})", component_names[0], component_names[1]),
            TermType::Property => format!("({} --}} {})", component_names[0], component_names[1]),
            TermType::ExtensionalSet => format!("{{{}}}", component_names.join(", ")),
            TermType::IntensionalSet => format!("[{}]", component_names.join(", ")),

            // Fallback for any unimplemented or atomic types
            _ => format!("({:?}, {})", term_type, component_names.join(", ")),
        }
    }

    /// Creates a new simplified and canonical compound term.
    /// This is the primary factory method for creating all compound terms. It applies
    /// simplification and canonicalization rules recursively until a fixed point is reached.
    pub fn create_compound(term_type: TermType, components: Vec<Arc<Term>>) -> Arc<Term> {
        Term::simplify_and_construct(term_type, components)
    }

    /// Internal recursive function to simplify and construct a term.
    ///
    /// This function orchestrates the application of various simplification rules
    /// from the `term_simplification` module. It repeatedly applies rules in a
    /// specific order until the term reaches a "fixed point" where no more
    /// simplifications can be made.
    fn simplify_and_construct(
        term_type: TermType,
        mut components: Vec<Arc<Term>>,
    ) -> Arc<Term> {
        // Loop until no more simplifications can be applied.
        loop {
            let mut simplified = false;

            // Apply rules that return a new set of components.
            // We let the compiler infer the type to avoid parsing issues with complex function pointers.
            let component_rules = &[
                term_simplification::flatten_associative,
                term_simplification::sort_and_dedup_commutative,
            ];
            for rule in component_rules {
                if let Some(new_components) = rule(term_type, components.clone()) {
                    components = new_components;
                    simplified = true;
                }
            }
            if let Some(new_components) = term_simplification::eliminate_contradiction(term_type, &components) {
                components = new_components;
                simplified = true;
            }
            if let Some(new_components) = term_simplification::apply_absorption(term_type, &components) {
                components = new_components;
                simplified = true;
            }
            // Rule 6: Distributive Law is still disabled here to prevent infinite loops.

            // If component-based simplifications happened, restart the loop to re-evaluate.
            if simplified {
                continue;
            }

            // Apply rules that return a completely new term, which means we've reduced
            // the current term to something else (e.g., double negation, 1-ary reduction).
            if let Some(new_term) = term_simplification::apply_negation_rules(term_type, &components) {
                return new_term; // This is a final transformation.
            }
            if let Some(new_term) = term_simplification::reduce_unary(term_type, components.clone()) {
                return new_term; // This is a final transformation.
            }

            // If we've gone through all rules and no simplifications occurred, break the loop.
            break;
        }

        // Base Case: No more simplifications can be applied. Construct the final term.
        let name = Term::generate_name(&term_type, &components);
        let final_hash = Term::compute_hash(&name, &term_type, &Some(components.clone()));

        Arc::new(Term::create_compound_raw(
            name,
            term_type,
            components,
            final_hash,
        ))
    }

    /// Creates a new atomic term.
    pub fn new_atom(name: &str) -> Arc<Term> {
        let term_type = TermType::Atom;
        let hash = Term::compute_hash(name, &term_type, &None);
        Arc::new(Term {
            name: name.to_string(),
            term_type,
            complexity: 1,
            subject: None,
            predicate: None,
            components: None,
            hash,
        })
    }

    /// Creates a new compound term. This is a "raw" constructor.
    /// It assumes that simplification and canonicalization have already been applied.
    pub(crate) fn create_compound_raw(
        name: String,
        term_type: TermType,
        components: Vec<Arc<Term>>,
        hash: String,
    ) -> Self {
        let complexity = 1 + components.iter().map(|c| c.complexity).sum::<u64>();

        // Assign subject and predicate only for term types where it is semantically correct.
        let (subject, predicate) = match term_type {
            TermType::Inheritance
            | TermType::Similarity
            | TermType::Implication
            | TermType::Equivalence
            | TermType::SequentialConjunction
            | TermType::Instance
            | TermType::Property
            | TermType::Operation => {
                // These types have a clear subject-predicate or operator-operand structure.
                // We expect exactly two components for them.
                (Some(components[0].clone()), Some(components[1].clone()))
            }
            // For other types (Product, Conjunction, etc.), this relationship is not applicable.
            _ => (None, None),
        };

        Term {
            name,
            term_type,
            complexity,
            subject,
            predicate,
            components: Some(components),
            hash,
        }
    }
}

/// Implements the Display trait so the term can be printed in its Narsese form.
impl fmt::Display for Term {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name)
    }
}

/// Implements Hash, allowing `Term` to be used in hash-based collections like `HashSet`.
/// The hash is based on the pre-computed `hash` field for efficiency.
impl Hash for Term {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.hash.hash(state);
    }
}

/// Implements PartialEq, defining equality based on the content hash.
/// Two terms are equal if and only if their hashes are identical.
impl PartialEq for Term {
    fn eq(&self, other: &Self) -> bool {
        self.hash == other.hash
    }
}

/// Implements Eq, marking that `Term` has a total equivalence relation.
impl Eq for Term {}

/// A helper module for `serde` to handle the custom serialization and deserialization
/// of `Arc<Term>`. This is used with the `#[serde(with = "...")]` attribute.
pub mod arc_term_serde {
    use super::*;
    use serde::{de::Error, Deserializer, Serializer};

    /// Serializes an `Arc<Term>` into its Narsese string representation.
    pub fn serialize<S>(term: &Arc<Term>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&term.name)
    }

    /// Deserializes an `Arc<Term>` from its Narsese string representation.
    ///
    /// This re-uses the main system parser to ensure that the reconstructed
    /// term is canonical and shared, just like any other term created at runtime.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Arc<Term>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        parser::parse_term(&s).map_err(D::Error::custom)
    }
}

// All tests related to term creation and simplification will be moved to `src/memory/tests.rs`
// to reflect that this logic is now owned by the `Memory` component.