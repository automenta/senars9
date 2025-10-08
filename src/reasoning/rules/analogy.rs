//! Implements the analogy inference rule.
//!
//! This rule generates questions based on similarity. For example, from
//! `(S <-> M)` and `(S --> P)`, it derives `(M --> P)?`.

//! Implements the analogy inference rule.
//!
//! This rule generates questions based on similarity. For example, from
//! `(S <-> M)` and `(S --> P)`, it derives `(M --> P)?`.

use crate::cycle::context::CycleContext;
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
    fn apply(&self, similarity_task: &Arc<Task>, memory: &mut Memory, context: &CycleContext) -> Vec<Task> {
        let mut derived = Vec::new();
        if let (Some(s_term), Some(m_term)) = (
            &similarity_task.term().subject,
            &similarity_task.term().predicate,
        ) {
            // This helper function encapsulates the logic for one direction of the analogy.
            let derive_questions = |term1: &Arc<Term>, term2: &Arc<Term>| {
                let mut questions = Vec::new();

                // Find all terms P such that (term1 --> P) exists.
                if let Some(properties) = memory.get_inheritance_by_subject(term1) {
                    let property_terms: Vec<Arc<Term>> = properties
                        .iter()
                        .filter_map(|task| task.term().predicate.clone())
                        .collect();

                    // For each found property P, create the question (term2 --> P)?
                    for p_term in property_terms {
                        // Found (term1 --> P), derive (term2 --> P)?
                        let new_term = Term::create_compound(
                            TermType::Inheritance,
                            vec![term2.clone(), p_term],
                        );
                        let new_question = Task::new(
                            new_term,
                            Punctuation::Question,
                            None,
                            context.current_time,
                            context.current_time,
                        );
                        questions.push(new_question);
                    }
                }
                questions
            };

            // Case 1: Find properties of S to ask about M. (S --> P) => (M --> P)?
            derived.extend(derive_questions(s_term, m_term));

            // Case 2: Find properties of M to ask about S. (M --> P) => (S --> P)?
            derived.extend(derive_questions(m_term, s_term));
        }
        derived
    }
}