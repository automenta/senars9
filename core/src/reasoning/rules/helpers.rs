//! Contains shared helper functions for inference rules, primarily for refactoring
//! duplicated logic from syllogistic rules.

use crate::cycle::context::CycleContext;
use crate::data_structures::{
    punctuation::Punctuation, task::Task, term::Term, term_type::TermType,
    truth_value::TruthValue,
};
use crate::memory::Memory;
use std::sync::Arc;

/// A generic helper function to apply syllogistic inference rules.
///
/// This function abstracts the common pattern found in rules like deduction,
/// induction, and abduction:
/// 1. Take a first premise.
/// 2. Find a second premise in memory based on some criteria.
/// 3. Derive a conclusion from the two premises.
///
/// # Type Parameters
/// * `QueryFn`: A closure that takes memory and components of the first premise,
///   and returns a collection of candidate second premises. It can return a
///   `Vec` of references to avoid unnecessary cloning.
/// * `ConstructFn`: A closure that takes the components of both premises and
///   returns the subject and predicate for the new derived term.
/// * `TruthFn`: A closure that calculates the truth value of the conclusion.
///
/// # Arguments
/// * `premise1`: The first premise task.
/// * `memory`: The system's memory, used to find the second premise.
/// * `context`: The current cycle's context.
/// * `query_premises2`: The `QueryFn` closure.
/// * `construct_new_term_components`: The `ConstructFn` closure.
/// * `calculate_new_truth`: The `TruthFn` closure.
/// * `exclude_self`: A boolean indicating whether `premise1` can be used as `premise2`.
#[allow(clippy::too_many_arguments)]
pub fn apply_syllogistic_rule<QueryFn, ConstructFn, TruthFn>(
    premise1: &Arc<Task>,
    memory: &Memory,
    context: &CycleContext,
    query_premises2: QueryFn,
    construct_new_term_components: ConstructFn,
    calculate_new_truth: TruthFn,
    exclude_self: bool,
) -> Vec<Task>
where
    QueryFn: for<'a> Fn(&'a Memory, &'a Arc<Term>, &'a Arc<Term>) -> Option<Vec<&'a Arc<Task>>>,
    ConstructFn: Fn(&Arc<Term>, &Arc<Term>, &Arc<Term>, &Arc<Term>) -> (Arc<Term>, Arc<Term>),
    TruthFn: Fn(&TruthValue, &TruthValue) -> TruthValue,
{
    let mut derived = Vec::new();

    // Deconstruct the first premise.
    if let (Some(s1), Some(p1), Some(truth1)) =
        (&premise1.term().subject, &premise1.term().predicate, premise1.truth)
    {
        // Find candidate second premises using the provided query function.
        let premises2_refs = match query_premises2(memory, s1, p1) {
            Some(tasks) => tasks,
            None => return derived,
        };

        // Convert refs to owned Arcs and iterate.
        let premises2: Vec<Arc<Task>> = premises2_refs.iter().map(|&task| task.clone()).collect();
        for premise2 in premises2 {
            // Skip if the rule requires excluding the premise itself.
            if exclude_self && Arc::ptr_eq(&premise2, premise1) {
                continue;
            }

            // Deconstruct the second premise.
            if let (Some(s2), Some(p2), Some(truth2)) =
                (&premise2.term().subject, &premise2.term().predicate, premise2.truth)
            {
                // Construct the new term from the components of both premises.
                let (new_subject, new_predicate) = construct_new_term_components(s1, p1, s2, p2);
                let new_term = Term::create_compound(
                    TermType::Inheritance,
                    vec![new_subject, new_predicate],
                );

                // Calculate the new truth value.
                let new_truth = calculate_new_truth(&truth1, &truth2);

                // Create the new derived task.
                let new_task = Task::new(
                    new_term,
                    Punctuation::Belief,
                    Some(new_truth),
                    context.current_time,
                    context.current_time,
                );
                derived.push(new_task);
            }
        }
    }
    derived
}

/// A macro to define a syllogistic inference rule.
///
/// This macro generates the necessary struct and `InferenceRule` implementation
/// for a standard syllogistic rule, reducing boilerplate code.
///
/// # Arguments
/// * `$struct_name`: The name of the struct to be created for the rule.
/// * `$query_fn`: A lambda expression for querying the second premise.
/// * `$construct_fn`: A lambda expression for constructing the conclusion's term.
/// * `$truth_fn`: The truth function to be used (e.g., `TruthValue::deduction`).
/// * `$exclude_self`: A boolean indicating if premise1 can also be premise2.
#[macro_export]
macro_rules! define_syllogistic_rule {
    ($struct_name:ident, $query_fn:expr, $construct_fn:expr, $truth_fn:expr, $exclude_self:expr) => {
        pub struct $struct_name;

        impl $crate::reasoning::inference_rule::InferenceRule for $struct_name {
            fn get_trigger_term_type(&self) -> $crate::data_structures::term_type::TermType {
                $crate::data_structures::term_type::TermType::Inheritance
            }

            fn apply(
                &self,
                premise1: &std::sync::Arc<$crate::data_structures::task::Task>,
                memory: &mut $crate::memory::Memory,
                context: &$crate::cycle::context::CycleContext,
            ) -> Vec<$crate::data_structures::task::Task> {
                $crate::reasoning::rules::helpers::apply_syllogistic_rule(
                    premise1,
                    memory,
                    context,
                    $query_fn,
                    $construct_fn,
                    $truth_fn,
                    $exclude_self,
                )
            }
        }
    };
}