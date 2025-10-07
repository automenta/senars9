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