use super::term::Term;
use super::punctuation::Punctuation;
use super::truth_value::TruthValue;

/// Represents a task in the SeNARS system.
#[derive(Debug, Clone, PartialEq)]
pub struct Task {
    /// The term associated with the task.
    pub term: Term,
    /// The punctuation of the task, indicating its type.
    pub punctuation: Punctuation,
    /// The truth value of the task (if it is a belief).
    pub truth: Option<TruthValue>,
    /// The priority of the task.
    pub priority: f64,
    /// The timestamp of the last access to the task.
    pub accessed_at: u64,
    /// The timestamp of when the task was created.
    pub created_at: u64,
    /// The time when the event occurred.
    pub occurrence_time: Option<u64>,
    /// The time when the task becomes obsolete.
    pub expiration_time: Option<u64>,
    /// Whether the task is in the focus set.
    pub is_in_focus_set: bool,
    /// The derivation path of the task.
    pub derivation_path: Option<Vec<String>>,
}