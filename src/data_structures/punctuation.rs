use std::fmt;

/// Represents the punctuation of a task, indicating its type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Punctuation {
    /// Represents a statement of belief.
    Belief,
    /// Represents a goal to be achieved.
    Goal,
    /// Represents a question to be answered.
    Question,
}

impl fmt::Display for Punctuation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Punctuation::Belief => write!(f, "."),
            Punctuation::Goal => write!(f, "!"),
            Punctuation::Question => write!(f, "?"),
        }
    }
}