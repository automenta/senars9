//! Implements the analogy inference rule.
//!
//! This rule generates questions based on similarity. For example, from
//! `(S <-> M)` and `(S --> P)`, it derives `(M --> P)?`.

use crate::data_structures::{punctuation::Punctuation, task::Task, term::Term, term_type::TermType};
use crate::memory::Memory;
use crate::reasoning::inference_rule::InferenceRule;
use std::sync::Arc;

/// The Analogy rule struct.
pub struct Analogy;

impl InferenceRule for Analogy {
    /// This rule is triggered by a `Similarity` term.
    fn get_trigger_term_type(&self) -> TermType {
        TermType::Similarity
    }

    /// Applies the analogy rule.
    ///
    /// Given a premise `(S <-> M).` and another premise `(S --> P).`, it derives
    /// a new question `(M --> P)?`. This rule generates questions based on similarity.
    /// It works symmetrically, also deriving `(S --> P)?` from `(M --> P).`.
    fn apply(&self, similarity_task: &Arc<Task>, memory: &mut Memory) -> Vec<Task> {
        let mut derived = Vec::new();
        if let (Some(s), Some(m)) = (&similarity_task.term.subject, &similarity_task.term.predicate)
        {
            // This helper function encapsulates the logic for one direction of the analogy.
            let mut derive_questions = |term1: &Arc<Term>, term2: &Arc<Term>| {
                let mut questions = Vec::new();
                let properties_of_term1_preds: Vec<Arc<Term>> =
                    if let Some(properties) = memory.get_inheritance_by_subject(term1) {
                        properties
                            .iter()
                            .filter_map(|t| t.term.predicate.clone())
                            .collect()
                    } else {
                        Vec::new()
                    };

                for p in properties_of_term1_preds {
                    // Found (term1 --> P), derive (term2 --> P)?
                    let new_term = memory
                        .create_or_get_compound_term(TermType::Inheritance, vec![Arc::clone(term2), p]);
                    let new_question = Task::new(new_term, Punctuation::Question, None);
                    questions.push(new_question);
                }
                questions
            };

            // Case 1: Find properties of S to ask about M. (S --> P) => (M --> P)?
            derived.extend(derive_questions(s, m));

            // Case 2: Find properties of M to ask about S. (M --> P) => (S --> P)?
            derived.extend(derive_questions(m, s));
        }
        derived
    }
}