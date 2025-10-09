//! This module contains helper functions for simplifying and canonicalizing compound terms.
//! Each function implements a specific algebraic simplification rule.

use super::{term::Term, term_type::TermType};
use std::sync::Arc;

/// Rule 1: Associativity (Flattening).
/// Flattens nested terms of the same associative type.
/// Example: (&, A, (&, B, C)) -> (&, A, B, C)
pub fn flatten_associative(
    term_type: TermType,
    components: Vec<Arc<Term>>,
) -> Option<Vec<Arc<Term>>> {
    if (term_type == TermType::Conjunction || term_type == TermType::Disjunction)
        && components.iter().any(|c| c.term_type == term_type)
    {
        let new_components = components
            .into_iter()
            .flat_map(|c| {
                if c.term_type == term_type {
                    c.components.as_ref().unwrap().clone()
                } else {
                    vec![c]
                }
            })
            .collect();
        return Some(new_components);
    }
    None
}

/// Rule 2: Commutativity (Sorting) and Idempotency (Deduplication).
/// For commutative terms, sorts components by name and removes duplicates.
pub fn sort_and_dedup_commutative(
    term_type: TermType,
    mut components: Vec<Arc<Term>>,
) -> Option<Vec<Arc<Term>>> {
    let is_commutative = matches!(
        term_type,
        TermType::Conjunction | TermType::Disjunction | TermType::Similarity | TermType::Equivalence
    );
    if is_commutative {
        let original_len = components.len();
        components.sort_by(|a, b| a.name.cmp(&b.name));
        components.dedup_by(|a, b| a.hash == b.hash);
        if components.len() < original_len {
            return Some(components);
        }
    }
    None
}

/// Rule 3: Contradiction Elimination (for conjunctions).
/// Removes a term and its negation from a conjunction.
/// Example: (&, A, B, --A) -> (&, B)
pub fn eliminate_contradiction(
    term_type: TermType,
    components: &Vec<Arc<Term>>,
) -> Option<Vec<Arc<Term>>> {
    if term_type == TermType::Conjunction {
        let mut to_remove = std::collections::HashSet::new();
        for i in 0..components.len() {
            for j in (i + 1)..components.len() {
                let c1 = &components[i];
                let c2 = &components[j];
                if (c1.term_type == TermType::Negation
                    && c1.components.as_ref().unwrap()[0].hash == c2.hash)
                    || (c2.term_type == TermType::Negation
                        && c2.components.as_ref().unwrap()[0].hash == c1.hash)
                {
                    to_remove.insert(i);
                    to_remove.insert(j);
                }
            }
        }
        if !to_remove.is_empty() {
            let new_components: Vec<Arc<Term>> = components
                .iter()
                .enumerate()
                .filter(|(i, _)| !to_remove.contains(i))
                .map(|(_, c)| c.clone())
                .collect();
            // Avoid creating an empty conjunction `(&,)`, as the system has no FALSE term.
            if !new_components.is_empty() {
                return Some(new_components);
            }
        }
    }
    None
}

/// Rule 4: Absorption Laws.
/// Applies absorption rules like (&, A, (|, A, B)) -> A.
pub fn apply_absorption(
    term_type: TermType,
    components: &Vec<Arc<Term>>,
) -> Option<Vec<Arc<Term>>> {
    let absorbing_op = if term_type == TermType::Conjunction {
        Some(TermType::Disjunction)
    } else if term_type == TermType::Disjunction {
        Some(TermType::Conjunction)
    } else {
        None
    };

    if let Some(op) = absorbing_op {
        let mut absorbed_indices = std::collections::HashSet::new();
        for i in 0..components.len() {
            for j in 0..components.len() {
                if i == j {
                    continue;
                }
                let absorber = &components[i];
                let maybe_absorbed = &components[j];
                if maybe_absorbed.term_type == op
                    && maybe_absorbed.components.as_ref().unwrap().contains(absorber)
                {
                    absorbed_indices.insert(j);
                }
            }
        }
        if !absorbed_indices.is_empty() {
            let new_components = components
                .iter()
                .enumerate()
                .filter(|(i, _)| !absorbed_indices.contains(i))
                .map(|(_, c)| c.clone())
                .collect();
            return Some(new_components);
        }
    }
    None
}

/// Rule 5: Double Negation and De Morgan's Laws.
/// Handles (--, (--, A)) -> A and De Morgan's transformations.
pub fn apply_negation_rules(
    term_type: TermType,
    components: &[Arc<Term>],
) -> Option<Arc<Term>> {
    if term_type == TermType::Negation {
        let component = &components[0];
        // Double Negation: (--, (--, A)) -> A
        if component.term_type == TermType::Negation {
            return Some(component.components.as_ref().unwrap()[0].clone());
        }
        // De Morgan's Law: (--, (&, A, B)) -> (|, (--, A), (--, B))
        if component.term_type == TermType::Conjunction {
            let new_components = component
                .components
                .as_ref()
                .unwrap()
                .iter()
                .map(|c| Term::create_compound(TermType::Negation, vec![c.clone()]))
                .collect();
            return Some(Term::create_compound(TermType::Disjunction, new_components));
        }
        // De Morgan's Law: (--, (|, A, B)) -> (&, (--, A), (--, B))
        if component.term_type == TermType::Disjunction {
            let new_components = component
                .components
                .as_ref()
                .unwrap()
                .iter()
                .map(|c| Term::create_compound(TermType::Negation, vec![c.clone()]))
                .collect();
            return Some(Term::create_compound(TermType::Conjunction, new_components));
        }
    }
    None
}

/// Rule 7: 1-ary Reduction.
/// Reduces a single-component conjunction or disjunction to its component.
/// Example: (&, A) -> A
pub fn reduce_unary(
    term_type: TermType,
    mut components: Vec<Arc<Term>>,
) -> Option<Arc<Term>> {
    if (term_type == TermType::Conjunction || term_type == TermType::Disjunction)
        && components.len() == 1
    {
        return Some(components.remove(0));
    }
    None
}