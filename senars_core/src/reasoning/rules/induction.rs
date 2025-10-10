//! Implements the induction rule.
//!
//! This rule derives `(S --> P)` from `(M --> S)` and `(M --> P)`.

use crate::data_structures::truth_value::TruthValue;
use crate::define_syllogistic_rule;

// Define the rule using the macro.
define_syllogistic_rule!(
    Induction,
    // Query for the second premise: `(M --> P)`.
    // The key is `M`, which is the subject of `premise1` (`M --> S`).
    // We search for premises where `M` is also the subject.
    |mem, s1, _p1| mem.get_inheritance_by_subject(s1),
    // Construct the conclusion: `(S --> P)`.
    // `S` is the predicate of `premise1`, `P` is the predicate of `premise2`.
    |_s1, p1, _s2, p2| (p1.clone(), p2.clone()),
    // The truth function for induction.
    TruthValue::induction,
    // Induction requires two distinct premises.
    true
);