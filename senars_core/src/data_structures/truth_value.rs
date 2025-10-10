use serde::{Deserialize, Serialize};
use std::fmt;

/// Represents the truth value of a belief, consisting of frequency and confidence.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct TruthValue {
    /// The frequency of evidence supporting the belief (0.0 to 1.0).
    pub frequency: f64,
    /// The confidence in the belief (0.0 to 1.0).
    pub confidence: f64,
}

impl fmt::Display for TruthValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "%{};{}%", self.frequency, self.confidence)
    }
}

// Helper function for weakening confidence.
fn weak(c: f64) -> f64 {
    c / (c + 1.0)
}

impl TruthValue {
    /// Calculates the truth-value of a conclusion derived from two premises through deduction.
    ///
    /// P1: M --> P <f1, c1>
    /// P2: S --> M <f2, c2>
    /// C: S --> P <F, C>
    ///
    /// F = f1 * f2
    /// C = f1 * f2 * c1 * c2
    pub fn deduction(t1: &TruthValue, t2: &TruthValue) -> TruthValue {
        let f = t1.frequency * t2.frequency;
        let c = t1.frequency * t2.frequency * t1.confidence * t2.confidence;
        TruthValue {
            frequency: f,
            confidence: c,
        }
    }

    /// Calculates the truth-value for an inductive conclusion.
    ///
    /// P1: M --> S <f1, c1>
    /// P2: M --> P <f2, c2>
    /// C: S --> P <F, C>
    ///
    /// F = f1
    /// C = weak(c1 * c2) * f2
    pub fn induction(t1: &TruthValue, t2: &TruthValue) -> TruthValue {
        let f = t1.frequency;
        let c = weak(t1.confidence * t2.confidence) * t2.frequency;
        TruthValue {
            frequency: f,
            confidence: c,
        }
    }

    /// Calculates the truth-value for an abductive conclusion.
    ///
    /// P1: S --> M <f1, c1>
    /// P2: P --> M <f2, c2>
    /// C: S --> P <F, C>
    ///
    /// F = f2
    /// C = weak(c1 * c2) * f1
    pub fn abduction(t1: &TruthValue, t2: &TruthValue) -> TruthValue {
        let f = t2.frequency;
        let c = weak(t1.confidence * t2.confidence) * t1.frequency;
        TruthValue {
            frequency: f,
            confidence: c,
        }
    }

    /// Calculates the truth-value for a detachment (Modus Ponens) conclusion.
    ///
    /// P1: X <f1, c1>
    /// P2: X ==> Y <f2, c2>
    /// C: Y <F, C>
    ///
    /// F = f2
    /// C = (c1 * c2) * f1
    pub fn detachment(t1: &TruthValue, t2: &TruthValue) -> TruthValue {
        let f = t2.frequency;
        let c = (t1.confidence * t2.confidence) * t1.frequency;
        TruthValue {
            frequency: f,
            confidence: c,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deduction_calculation() {
        let t1 = TruthValue {
            frequency: 1.0,
            confidence: 0.9,
        };
        let t2 = TruthValue {
            frequency: 1.0,
            confidence: 0.8,
        };
        let result = TruthValue::deduction(&t1, &t2);
        // f = 1.0 * 1.0 = 1.0
        // c = 1.0 * 1.0 * 0.9 * 0.8 = 0.72
        assert_eq!(result.frequency, 1.0);
        assert!((result.confidence - 0.72).abs() < 1e-9);
    }

    #[test]
    fn test_induction_calculation() {
        let t1 = TruthValue {
            frequency: 0.8, // f1
            confidence: 0.8, // c1
        };
        let t2 = TruthValue {
            frequency: 0.7, // f2
            confidence: 0.9, // c2
        };
        let result = TruthValue::induction(&t1, &t2);
        // f = f1 = 0.8
        // c = weak(c1 * c2) * f2 = weak(0.8 * 0.9) * 0.7 = (0.72 / 1.72) * 0.7
        let expected_c = (0.72 / 1.72) * 0.7;
        assert_eq!(result.frequency, 0.8);
        assert!((result.confidence - expected_c).abs() < 1e-9);
    }

    #[test]
    fn test_abduction_calculation() {
        let t1 = TruthValue {
            frequency: 0.8, // f1
            confidence: 0.8, // c1
        };
        let t2 = TruthValue {
            frequency: 0.7, // f2
            confidence: 0.9, // c2
        };
        let result = TruthValue::abduction(&t1, &t2);
        // f = f2 = 0.7
        // c = weak(c1 * c2) * f1 = weak(0.8 * 0.9) * 0.8 = (0.72 / 1.72) * 0.8
        let expected_c = (0.72 / 1.72) * 0.8;
        assert_eq!(result.frequency, 0.7);
        assert!((result.confidence - expected_c).abs() < 1e-9);
    }

    #[test]
    fn test_detachment_calculation() {
        let t1 = TruthValue {
            frequency: 1.0, // f1
            confidence: 0.9, // c1
        };
        let t2 = TruthValue {
            frequency: 0.9, // f2
            confidence: 0.9, // c2
        };
        let result = TruthValue::detachment(&t1, &t2);
        // f = f2 = 0.9
        // c = (c1 * c2) * f1 = (0.9 * 0.9) * 1.0 = 0.81
        assert_eq!(result.frequency, 0.9);
        assert!((result.confidence - 0.81).abs() < 1e-9);
    }
}