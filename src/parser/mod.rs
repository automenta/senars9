use pest::Parser;
use pest_derive::Parser;
use crate::data_structures::term::Term;
use crate::data_structures::term_type::TermType;
use std::sync::Arc;

#[derive(Parser)]
#[grammar = "parser/term_grammar.pest"]
pub struct TermParser;

pub fn parse_term(input: &str) -> Result<Term, pest::error::Error<Rule>> {
    let pairs = TermParser::parse(Rule::term_entry, input)?;
    let pair = pairs.into_iter().next().unwrap().into_inner().next().unwrap();
    build_term_from_pair(pair)
}

fn build_term_from_pair(pair: pest::iterators::Pair<Rule>) -> Result<Term, pest::error::Error<Rule>> {
    match pair.as_rule() {
        Rule::term | Rule::compound_term => {
            // These are wrapper rules, so we descend into the single inner pair.
            build_term_from_pair(pair.into_inner().next().unwrap())
        }
        rule => {
            // This is a concrete rule, so we build the term.
            let name = pair.as_str().to_string();
            let term_type = match rule {
                Rule::atom => TermType::Atom,
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
                _ => unreachable!("Parser encountered unexpected rule: {:?}", rule),
            };

            let mut inner_pairs = pair.into_inner();
            let (subject, predicate, components) = match term_type {
                TermType::Atom => (None, None, None),
                TermType::Negation => {
                    let inner_term = build_term_from_pair(inner_pairs.next().unwrap())?;
                    (Some(Arc::new(inner_term)), None, None)
                }
                TermType::Product
                | TermType::Inheritance
                | TermType::Similarity
                | TermType::Implication
                | TermType::Equivalence
                | TermType::SequentialConjunction
                | TermType::Operation
                | TermType::Instance
                | TermType::Property => {
                    let subject = build_term_from_pair(inner_pairs.next().unwrap())?;
                    let predicate = build_term_from_pair(inner_pairs.next().unwrap())?;
                    (Some(Arc::new(subject)), Some(Arc::new(predicate)), None)
                }
                TermType::Conjunction | TermType::Disjunction | TermType::ExtensionalSet | TermType::IntensionalSet => {
                    let components = inner_pairs
                        .map(|p| build_term_from_pair(p).map(Arc::new))
                        .collect::<Result<Vec<_>, _>>()?;
                    (None, None, Some(components))
                }
            };

            // TODO: Calculate complexity, created_at, and hash properly
            Ok(Term {
                name,
                term_type,
                complexity: 1,
                subject,
                predicate,
                components,
                embedding: None,
                created_at: 0,
                hash: "".to_string(),
            })
        }
    }
}

#[cfg(test)]
mod tests;