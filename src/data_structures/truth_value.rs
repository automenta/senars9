/// Represents the truth value of a belief, consisting of frequency and confidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TruthValue {
    /// The frequency of evidence supporting the belief (0.0 to 1.0).
    pub frequency: f64,
    /// The confidence in the belief (0.0 to 1.0).
    pub confidence: f64,
}