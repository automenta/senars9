use super::term_type::TermType;
use std::collections::hash_map::DefaultHasher;
use std::fmt;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

/// Represents a term in the SeNARS system, the fundamental unit of knowledge.
///
/// `Term` is designed to be immutable, with its identity defined by its content hash.
/// This allows for efficient storage and retrieval in memory.
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
    /// simplification and canonicalization rules automatically.
    pub fn create_compound(term_type: TermType, mut components: Vec<Arc<Term>>) -> Arc<Term> {
        // 1. Associativity (Flattening) for n-ary operators
        if term_type == TermType::Conjunction || term_type == TermType::Disjunction {
            components = components.into_iter().flat_map(|comp_term| {
                if comp_term.term_type == term_type {
                    comp_term.components.as_ref().unwrap().clone()
                } else {
                    vec![comp_term]
                }
            }).collect();
        }

        // 2. Commutativity (Sorting) and Idempotency (Deduplication)
        let is_commutative = matches!(
            term_type,
            TermType::Conjunction | TermType::Disjunction | TermType::Similarity | TermType::Equivalence
        );

        if is_commutative {
            components.sort_by(|a, b| a.name.cmp(&b.name));
            components.dedup_by(|a, b| a.hash == b.hash);
        }

        // 3. 1-ary Reduction for Conjunction and Disjunction
        if (term_type == TermType::Conjunction || term_type == TermType::Disjunction) && components.len() == 1 {
            return components.remove(0);
        }

        // 4. Double Negation Reduction: (--, (--, A)) => A
        if term_type == TermType::Negation {
            if let Some(component_term) = components.first() {
                if component_term.term_type == TermType::Negation {
                    // component_term is (--, A), its component is A
                    return component_term.components.as_ref().unwrap()[0].clone();
                }
            }
        }

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
        let (subject, predicate) = if components.len() == 2 {
            (Some(components[0].clone()), Some(components[1].clone()))
        } else {
            (None, None)
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

// All tests related to term creation and simplification will be moved to `src/memory/tests.rs`
// to reflect that this logic is now owned by the `Memory` component.