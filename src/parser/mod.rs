use crate::data_structures::{
    punctuation::Punctuation,
    task::Task,
    term::Term,
    term_type::TermType,
    truth_value::TruthValue,
};
use pest::Parser;
use pest_derive::Parser;
use std::sync::Arc;

#[derive(Parser)]
#[grammar = "parser/narsese_grammar.pest"]
pub struct NarseseParser;

/// Parses a Narsese string into a `Task`.
///
/// This is the main entry point for the parser. It handles a complete Narsese statement,
/// including the term, punctuation, and an optional truth value. The resulting `Task` is
/// not yet stored in memory.
///
/// # Arguments
/// * `input` - A string slice representing the Narsese statement.
/// * `current_time` - The current timestamp to assign to the created task.
///
/// # Returns
/// A `Result` containing the parsed `Task` or a `pest` error.
pub fn parse(
    input: &str,
    current_time: u64,
) -> Result<Task, pest::error::Error<Rule>> {
    let pairs = NarseseParser::parse(Rule::narsese_entry, input)?;
    let statement_pair = pairs.into_iter().next().unwrap().into_inner().next().unwrap();
    build_task_from_pair(statement_pair, current_time)
}

/// Constructs a `Task` from a `statement` grammar rule pair.
fn build_task_from_pair(
    pair: pest::iterators::Pair<Rule>,
    current_time: u64,
) -> Result<Task, pest::error::Error<Rule>> {
    let inner_pair = pair.into_inner().next().unwrap();
    match inner_pair.as_rule() {
        Rule::belief => {
            let mut inner = inner_pair.into_inner();
            let term = build_term_from_pair(inner.next().unwrap())?;
            inner.next(); // Skip punctuation
            let truth = inner.next().map(build_truth_from_pair).transpose()?.flatten();
            Ok(Task::new(term, Punctuation::Belief, truth, current_time, current_time))
        }
        Rule::goal => {
            let mut inner = inner_pair.into_inner();
            let term = build_term_from_pair(inner.next().unwrap())?;
            Ok(Task::new(term, Punctuation::Goal, None, current_time, current_time))
        }
        Rule::question => {
            let mut inner = inner_pair.into_inner();
            let term = build_term_from_pair(inner.next().unwrap())?;
            Ok(Task::new(term, Punctuation::Question, None, current_time, current_time))
        }
        _ => unreachable!("Parser encountered unexpected statement rule: {:?}", inner_pair.as_rule()),
    }
}

/// Recursively constructs a `Term` from a `term` grammar rule pair.
fn build_term_from_pair(
    pair: pest::iterators::Pair<Rule>,
) -> Result<Arc<Term>, pest::error::Error<Rule>> {
    match pair.as_rule() {
        Rule::term | Rule::compound_term => {
            build_term_from_pair(pair.into_inner().next().unwrap())
        }
        Rule::atom => Ok(Term::new_atom(pair.as_str())),
        rule => {
            let term_type = match rule {
                Rule::negation => TermType::Negation,
                Rule::product => TermType::Product,
                Rule::inheritance => TermType::Inheritance,
                Rule::similarity => TermType::Similarity,
                Rule::implication => TermType::Implication,
                Rule::equivalence => TermType::Equivalence,
                Rule::conjunction => TermType::Conjunction,
                Rule::disjunction => TermType::Disjunction,
                Rule::sequential_conjunction => TermType::SequentialConjunction,
                Rule::operation => TermType::Operation,
                Rule::instance => TermType::Instance,
                Rule::property => TermType::Property,
                Rule::extensional_set => TermType::ExtensionalSet,
                Rule::intensional_set => TermType::IntensionalSet,
                _ => unreachable!("Parser encountered unexpected term rule: {:?}", rule),
            };

            let components = pair
                .into_inner()
                .map(build_term_from_pair)
                .collect::<Result<Vec<_>, _>>()?;

            Ok(Term::create_compound(term_type, components))
        }
    }
}

/// Constructs a `TruthValue` from a `truth_value` grammar rule pair.
fn build_truth_from_pair(
    pair: pest::iterators::Pair<Rule>,
) -> Result<Option<TruthValue>, pest::error::Error<Rule>> {
    let mut inner = pair.into_inner();
    let frequency: f64 = inner.next().unwrap().as_str().parse().unwrap();
    let confidence: f64 = inner.next().unwrap().as_str().parse().unwrap();
    Ok(Some(TruthValue {
        frequency,
        confidence,
    }))
}

#[cfg(test)]
mod tests;