use std::sync::Arc;
use super::term_type::TermType;

/// Represents a term in the SeNARS system.
#[derive(Debug, Clone, PartialEq)]
pub struct Term {
    /// The name of the term.
    pub name: String,
    /// The type of the term.
    pub term_type: TermType,
    /// The complexity of the term.
    pub complexity: u64,
    /// The subject of a compound term (if applicable).
    pub subject: Option<Arc<Term>>,
    /// The predicate of a compound term (if applicable).
    pub predicate: Option<Arc<Term>>,
    /// The components of a compound term (if applicable).
    pub components: Option<Vec<Arc<Term>>>,
    /// The semantic embedding of the term.
    pub embedding: Option<Vec<f32>>,
    /// The timestamp of when the term was created.
    pub created_at: u64,
    /// The hash of the term.
    pub hash: String,
}