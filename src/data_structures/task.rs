use super::punctuation::Punctuation;
use super::term::Term;
use super::truth_value::TruthValue;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;

/// Represents a task in the SeNARS system.
///
/// `priority` and `accessed_at` use atomic types for efficient, lock-free updates,
/// allowing these fields to be modified even when the Task is behind an `Arc`.
#[derive(Clone)]
pub struct Task {
    pub term: Arc<Term>,
    pub punctuation: Punctuation,
    pub truth: Option<TruthValue>,
    /// The priority of the task, stored as the bits of an f32.
    priority: AtomicU32,
    /// The timestamp of the last access.
    accessed_at: AtomicU64,
    pub created_at: u64,
    pub occurrence_time: Option<u64>,
    pub expiration_time: Option<u64>,
    pub derivation_path: Option<Vec<String>>,
}

impl Task {
    pub fn new(
        term: Arc<Term>,
        punctuation: Punctuation,
        truth: Option<TruthValue>,
        created_at: u64,
        occurrence_time: u64,
    ) -> Self {
        Task {
            term,
            punctuation,
            truth,
            priority: AtomicU32::new(0.5f32.to_bits()), // Default priority
            accessed_at: AtomicU64::new(created_at),
            created_at,
            occurrence_time: Some(occurrence_time),
            expiration_time: None,
            derivation_path: None,
        }
    }

    pub fn term(&self) -> &Arc<Term> {
        &self.term
    }

    pub fn get_priority(&self) -> f32 {
        f32::from_bits(self.priority.load(Ordering::Relaxed))
    }

    pub fn set_priority(&self, new_priority: f32) {
        self.priority.store(new_priority.to_bits(), Ordering::Relaxed);
    }

    pub fn get_accessed_at(&self) -> u64 {
        self.accessed_at.load(Ordering::Relaxed)
    }

    pub fn set_accessed_at(&self, new_time: u64) {
        self.accessed_at.store(new_time, Ordering::Relaxed);
    }

    pub fn is_belief(&self) -> bool {
        self.punctuation == Punctuation::Belief
    }

    pub fn is_goal(&self) -> bool {
        self.punctuation == Punctuation::Goal
    }

    pub fn is_question(&self) -> bool {
        self.punctuation == Punctuation::Question
    }

    pub fn is_expired(&self, current_time: u64) -> bool {
        if let Some(expiration) = self.expiration_time {
            current_time > expiration
        } else {
            false
        }
    }
}

// Manual trait implementations due to atomic fields.

impl fmt::Debug for Task {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Task")
            .field("term", &self.term)
            .field("punctuation", &self.punctuation)
            .field("truth", &self.truth)
            .field("priority", &self.get_priority())
            .field("accessed_at", &self.get_accessed_at())
            .field("created_at", &self.created_at)
            .field("occurrence_time", &self.occurrence_time)
            .field("expiration_time", &self.expiration_time)
            .field("derivation_path", &self.derivation_path)
            .finish()
    }
}

impl PartialEq for Task {
    fn eq(&self, other: &Self) -> bool {
        self.term == other.term
            && self.punctuation == other.punctuation
            && self.truth == other.truth
            && self.get_priority() == other.get_priority()
            && self.get_accessed_at() == other.get_accessed_at()
            && self.created_at == other.created_at
            && self.occurrence_time == other.occurrence_time
            && self.expiration_time == other.expiration_time
            && self.derivation_path == other.derivation_path
    }
}

impl fmt::Display for Task {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let term_str = self.term().to_string();
        let punc_str = self.punctuation.to_string();
        match &self.truth {
            Some(truth) => write!(f, "{}{} {}", term_str, punc_str, truth),
            None => write!(f, "{}{}", term_str, punc_str),
        }
    }
}

// --- Serialization ---

#[derive(Serialize, Deserialize)]
struct TaskSerdeHelper {
    #[serde(with = "super::term::arc_term_serde")]
    term: Arc<Term>,
    punctuation: Punctuation,
    truth: Option<TruthValue>,
    priority: f32,
    accessed_at: u64,
    created_at: u64,
    occurrence_time: Option<u64>,
    expiration_time: Option<u64>,
    derivation_path: Option<Vec<String>>,
}

impl Serialize for Task {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let helper = TaskSerdeHelper {
            term: self.term.clone(),
            punctuation: self.punctuation,
            truth: self.truth.clone(),
            priority: self.get_priority(),
            accessed_at: self.get_accessed_at(),
            created_at: self.created_at,
            occurrence_time: self.occurrence_time,
            expiration_time: self.expiration_time,
            derivation_path: self.derivation_path.clone(),
        };
        helper.serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for Task {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let helper = TaskSerdeHelper::deserialize(deserializer)?;
        Ok(Task {
            term: helper.term,
            punctuation: helper.punctuation,
            truth: helper.truth,
            priority: AtomicU32::new(helper.priority.to_bits()),
            accessed_at: AtomicU64::new(helper.accessed_at),
            created_at: helper.created_at,
            occurrence_time: helper.occurrence_time,
            expiration_time: helper.expiration_time,
            derivation_path: helper.derivation_path,
        })
    }
}