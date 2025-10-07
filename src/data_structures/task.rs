use super::punctuation::Punctuation;
use super::term::Term;
use super::truth_value::TruthValue;
use std::fmt;
use std::sync::Arc;

/// Represents a task in the SeNARS system, which can be a belief, goal, or question.
///
/// Tasks are the primary units of work and information flow within the system.
#[derive(Debug, Clone, PartialEq)]
pub struct Task {
    /// The term that this task is about.
    pub term: Arc<Term>,
    /// The punctuation indicating the task type (e.g., Belief '.', Goal '!', Question '?').
    pub punctuation: Punctuation,
    /// The truth value associated with the task, representing its evidential support.
    pub truth: Option<TruthValue>,
    /// The current priority of the task, determining its processing urgency.
    pub priority: f64,
    /// The timestamp of the last time the task was accessed or used in reasoning.
    pub accessed_at: u64,
    /// The timestamp of when the task was created.
    pub created_at: u64,
    /// For events, the time the event occurred. For inferences, the time of the conclusion.
    pub occurrence_time: Option<u64>,
    /// The time at which the task becomes obsolete and can be forgotten.
    pub expiration_time: Option<u64>,
    /// A flag indicating if the task is currently in the focus set for a reasoning cycle.
    pub is_in_focus_set: bool,
    /// A record of the reasoning steps that led to this task's creation.
    pub derivation_path: Option<Vec<String>>,
}

impl Task {
    /// Creates a new `Task` with default values.
    ///
    /// # Arguments
    /// * `term` - The `Term` this task is about.
    /// * `punctuation` - The `Punctuation` defining the task type.
    /// * `truth` - An optional `TruthValue` for beliefs.
    pub fn new(term: Arc<Term>, punctuation: Punctuation, truth: Option<TruthValue>) -> Self {
        // Timestamps would typically be set by a central time source.
        let current_time = 0;
        Task {
            term,
            punctuation,
            truth,
            priority: 0.5, // Default priority
            accessed_at: current_time,
            created_at: current_time,
            occurrence_time: Some(current_time),
            expiration_time: None, // No expiration by default
            is_in_focus_set: false,
            derivation_path: None,
        }
    }

    /// Checks if the task is a belief.
    pub fn is_belief(&self) -> bool {
        self.punctuation == Punctuation::Belief
    }

    /// Checks if the task is a goal.
    pub fn is_goal(&self) -> bool {
        self.punctuation == Punctuation::Goal
    }

    /// Checks if the task is a question.
    pub fn is_question(&self) -> bool {
        self.punctuation == Punctuation::Question
    }

    /// Checks if the task has expired based on the current time.
    ///
    /// # Arguments
    /// * `current_time` - The current system time to check against.
    pub fn is_expired(&self, current_time: u64) -> bool {
        if let Some(expiration) = self.expiration_time {
            current_time > expiration
        } else {
            false
        }
    }
}

/// Implements the Display trait to provide a Narsese-like representation of the Task.
impl fmt::Display for Task {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let term_str = self.term.to_string();
        let punc_str = self.punctuation.to_string();
        match &self.truth {
            Some(truth) => write!(f, "{}{} {}", term_str, punc_str, truth),
            None => write!(f, "{}{}", term_str, punc_str),
        }
    }
}