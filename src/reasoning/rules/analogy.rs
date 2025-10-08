//! Implements the analogy inference rule.
//!
//! This rule generates questions based on similarity. For example, from
//! `(S <-> M)` and `(S --> P)`, it derives `(M --> P)?`.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    concept::Concept, punctuation::Punctuation, task::Task, term_type::TermType,
};
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
            // Get the concepts for S and M from memory.
            let s_concept = match memory.concept_storage.get(&s_term.hash) {
                Some(c) => c.clone(),
                None => return derived,
            };
            let m_concept = match memory.concept_storage.get(&m_term.hash) {
                Some(c) => c.clone(),
                None => return derived,
            };

            // This helper function encapsulates the logic for one direction of the analogy.
            let mut derive_questions = |concept1: &Arc<Concept>, concept2: &Arc<Concept>| {
                let mut questions = Vec::new();

                // Find all terms P such that (concept1.term --> P) exists.
                let properties_of_concept1: Vec<Arc<Concept>> =
                    if let Some(properties) = memory.get_inheritance_by_subject(&concept1.term) {
                        properties
                            .iter()
                            .filter_map(|t| {
                                // Get the predicate term P
                                let p_term = t.term().predicate.as_ref()?;
                                // Get the concept for P from memory
                                memory.concept_storage.get(&p_term.hash).cloned()
                            })
                            .collect()
                    } else {
                        Vec::new()
                    };

                // For each found property P, create the question (concept2.term --> P)?
                for p_concept in properties_of_concept1 {
                    // Found (concept1 --> P), derive (concept2 --> P)?
                    let new_concept = memory.create_or_get_compound_term(
                        TermType::Inheritance,
                        vec![concept2.clone(), p_concept],
                        context.current_time,
                    );
                    let new_question = Task::new(
                        new_concept,
                        Punctuation::Question,
                        None,
                        context.current_time,
                        context.current_time,
                    );
                    questions.push(new_question);
                }
                questions
            };

            // Case 1: Find properties of S to ask about M. (S --> P) => (M --> P)?
            derived.extend(derive_questions(&s_concept, &m_concept));

            // Case 2: Find properties of M to ask about S. (M --> P) => (S --> P)?
            derived.extend(derive_questions(&m_concept, &s_concept));
        }
        derived
    }
}