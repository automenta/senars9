//! Implements the abduction rule.
//!
//! This rule derives `(S --> P)` from `(S --> M)` and `(P --> M)`.

use crate::data_structures::truth_value::TruthValue;
use crate::define_syllogistic_rule;

// Define the rule using the macro.
define_syllogistic_rule!(
    Abduction,
    // Query for the second premise: `(P --> M)`.
    // The key is `M`, which is the predicate of `premise1` (`S --> M`).
    // We search for premises where `M` is also the predicate.
    |mem, _s1, p1| mem.get_inheritance_by_predicate(p1),
    // Construct the conclusion: `(S --> P)`.
    // `S` is the subject of `premise1`, `P` is the subject of `premise2`.
    |s1, _p1, s2, _p2| (s1.clone(), s2.clone()),
    // The truth function for abduction.
    TruthValue::abduction,
    // Abduction requires two distinct premises.
    true
);