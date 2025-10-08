//! This module defines the `Concept` struct, which represents the system's internal
//! understanding of a `Term`.

use super::term::Term;
use std::sync::Arc;

/// Represents a concept in the SeNARS system.
///
/// A `Concept` is the system's internal representation of a `Term`. It bundles the
/// immutable `Term` itself with metadata that can change over time, such as its
/// activation level, access time, and semantic embedding. This separates the pure,
//  syntactic `Term` from its context-dependent data within the system's memory.
#[derive(Debug, Clone, PartialEq)]
pub struct Concept {
    /// The immutable term that this concept is about.
    pub term: Arc<Term>,
    /// The timestamp (ms) of when the concept was created.
    pub created_at: u64,
    /// The semantic embedding vector for the term, used for neural-symbolic integration.
    pub embedding: Option<Vec<f32>>,
    // NOTE: Other metadata like activation, recency, etc., will be added here in the future.
}

impl Concept {
    /// Creates a new `Concept`.
    pub fn new(term: Arc<Term>, created_at: u64) -> Self {
        Concept {
            term,
            created_at,
            embedding: None,
        }
    }
}