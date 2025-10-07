use crate::data_structures::{
    task::Task,
    term::Term,
    term_type::TermType,
    punctuation::Punctuation,
    truth_value::TruthValue,
};
use std::sync::Arc;

/// Represents the reasoning component of the SeNARS system.
#[derive(Debug, Default)]
pub struct Reasoner;

impl Reasoner {
    /// Creates a new Reasoner.
    pub fn new() -> Self {
        Reasoner
    }

    /// Applies inference rules to a set of tasks to derive new knowledge.
    ///
    /// This implementation performs a simple deductive inference on inheritance chains.
    /// If it finds two tasks `(A --> B)` and `(B --> C)`, it derives `(A --> C)`.
    pub fn reason(&self, focus_set: &[&Task]) -> Vec<Task> {
        let mut derived_tasks = Vec::new();
        let inheritance_tasks: Vec<&Task> = focus_set
            .iter()
            .filter(|t| t.term.term_type == TermType::Inheritance)
            .cloned()
            .collect();

        for &task1 in &inheritance_tasks {
            for &task2 in &inheritance_tasks {
                if let (Some(subject1), Some(predicate1), Some(subject2), Some(predicate2)) =
                    (&task1.term.subject, &task1.term.predicate, &task2.term.subject, &task2.term.predicate)
                {
                    // Look for a chain: (A --> B) and (B --> C)
                    if predicate1.name == subject2.name {
                        // Found a chain. Derive (A --> C).
                        let new_term_name = format!("({} --> {})", subject1.name, predicate2.name);
                        println!("Derived new term: {}", new_term_name);

                        // TODO: Calculate new truth value based on premises.
                        let new_truth = TruthValue {
                            frequency: 1.0,
                            confidence: 0.81, // 0.9 * 0.9
                        };

                        let new_term = Term {
                            name: new_term_name,
                            term_type: TermType::Inheritance,
                            complexity: subject1.complexity + predicate2.complexity + 1,
                            subject: Some(Arc::clone(subject1)),
                            predicate: Some(Arc::clone(predicate2)),
                            components: None,
                            embedding: None,
                            created_at: 0, // TODO: Set current time
                            hash: "".to_string(), // TODO: Calculate hash
                        };

                        let new_task = Task {
                            term: new_term,
                            punctuation: Punctuation::Belief,
                            truth: Some(new_truth),
                            priority: 0.8, // TODO: Calculate priority
                            accessed_at: 0,
                            created_at: 0,
                            occurrence_time: None,
                            expiration_time: None,
                            is_in_focus_set: false,
                            derivation_path: Some(vec![task1.term.name.clone(), task2.term.name.clone()]),
                        };
                        derived_tasks.push(new_task);
                    }
                }
            }
        }
        derived_tasks
    }
}

#[cfg(test)]
mod tests;