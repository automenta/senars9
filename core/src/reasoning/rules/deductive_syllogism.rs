//! Implements the deductive syllogism rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(M --> P)`.

use crate::data_structures::truth_value::TruthValue;
use crate::define_syllogistic_rule;

// Define the rule using the macro.
define_syllogistic_rule!(
    DeductiveSyllogism,
    // Query for the second premise: `(M --> P)`.
    // The key is `M`, which is the predicate of `premise1` (`S --> M`).
    // We search for premises where `M` is the subject.
    |mem, _s1, p1| mem.get_inheritance_by_subject(p1),
    // Construct the conclusion: `(S --> P)`.
    // `S` is the subject of `premise1`, `P` is the predicate of `premise2`.
    |s1, _p1, _s2, p2| (s1.clone(), p2.clone()),
    // The truth function for deduction.
    TruthValue::deduction,
    // It's valid for `premise1` to be its own counterpart, so `exclude_self` is false.
    false
);