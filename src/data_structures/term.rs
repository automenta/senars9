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
    /// The semantic embedding vector for the term, used for neural-symbolic integration.
    pub embedding: Option<Vec<f32>>,
    /// The timestamp (ms) of when the term was created.
    pub created_at: u64,
    /// A unique hash identifying the term's content, used for equality checks and hashing.
    pub hash: String,
}

impl Term {
    /// Computes a SHA256 hash for the term's identifying components.
    fn compute_hash(name: &str, term_type: &TermType, components: &Option<Vec<Arc<Term>>>) -> String {
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

    /// Generates a name for a compound term based on its type and components.
    /// This is the standard Narsese representation, as defined in `SPECIFICATION.md`.
    fn generate_name(term_type: &TermType, components: &[Arc<Term>]) -> String {
        let component_names: Vec<String> = components.iter().map(|c| c.name.clone()).collect();
        match term_type {
            // Core Relationship Operators
            TermType::Negation => format!("(--, {})", component_names[0]),
            TermType::Inheritance => format!("({} --> {})", component_names[0], component_names[1]),
            TermType::Similarity => format!("({} <-> {})", component_names[0], component_names[1]),
            TermType::Implication => format!("({} ==> {})", component_names[0], component_names[1]),
            TermType::Equivalence => format!("({} <=> {})", component_names[0], component_names[1]),
            TermType::Conjunction => format!("(&, {}, {})", component_names[0], component_names[1]),
            TermType::Disjunction => format!("(|, {}, {})", component_names[0], component_names[1]),
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

    /// Creates a new atomic term (a term with no internal structure).
    pub fn new_atom(name: &str) -> Self {
        let term_type = TermType::Atom;
        let hash = Term::compute_hash(name, &term_type, &None);
        Term {
            name: name.to_string(),
            term_type,
            complexity: 1,
            subject: None,
            predicate: None,
            components: None,
            embedding: None,
            created_at: 0, // To be set by the memory system upon creation.
            hash,
        }
    }

    /// Creates a new compound term from its constituent components.
    pub fn new_compound(term_type: TermType, components: Vec<Arc<Term>>) -> Self {
        let complexity = 1 + components.iter().map(|c| c.complexity).sum::<u64>();
        let name = Term::generate_name(&term_type, &components);
        let hash = Term::compute_hash(&name, &term_type, &Some(components.clone()));

        // For binary relations, assign subject and predicate for convenience.
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
            embedding: None,
            created_at: 0,
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