use super::term_type::TermType;
use crate::parser;
use serde::{de::Error, Deserialize, Deserializer, Serialize, Serializer};
use std::collections::hash_map::DefaultHasher;
use std::fmt;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

/// Represents a term in the SeNARS system, the fundamental unit of knowledge.
///
/// `Term` is designed to be immutable, with its identity defined by its content hash.
/// This allows for efficient storage and retrieval in memory.
///
/// # Serialization
/// `Term` uses custom `Serialize` and `Deserialize` implementations.
/// - It serializes into its Narsese string representation (e.g., `"(A --> B)"`).
/// - It deserializes from this string back into a canonical, shared `Arc<Term>`,
///   re-using the system's parser to ensure invariants are maintained.
#[derive(Debug, Clone)]
pub struct Term {
    /// The name of the term, which also serves as its string representation in Narsese.
    pub name: String,
    /// The type of the term (e.g., Atom, Inheritance).
    pub term_type: TermType,
    /// The complexity of the term, calculated based on its components.
    pub complexity: u64,
    /// The subject of a compound term (e.g., in `(A --> B)`, `A` is the subject).
    pub subject: Option<Arc<Term>>,
    /// The predicate of a compound term (e.g., in `(A --> B)`, `B` is the predicate).
    pub predicate: Option<Arc<Term>>,
    /// The components of a compound term.
    pub components: Option<Vec<Arc<Term>>>,
    /// A unique hash identifying the term's content, used for equality checks and hashing.
    pub hash: String,
}

impl Term {
    /// Computes a SHA256 hash for the term's identifying components.
    pub fn compute_hash(name: &str, term_type: &TermType, components: &Option<Vec<Arc<Term>>>) -> String {
        let mut hasher = DefaultHasher::new();
        name.hash(&mut hasher);
        term_type.hash(&mut hasher);
        if let Some(comps) = components {
            for component in comps {
                component.hash.hash(&mut hasher);
            }
        }
        format!("{:x}", hasher.finish())
    }

    /// Computes a hash for an atomic term, used for quick lookups.
    pub fn compute_hash_for_atom(name: &str) -> String {
        let term_type = TermType::Atom;
        Term::compute_hash(name, &term_type, &None)
    }

    /// Generates a name for a compound term based on its type and components.
    /// This is the standard Narsese representation, as defined in `SPECIFICATION.md`.
    pub fn generate_name(term_type: &TermType, components: &[Arc<Term>]) -> String {
        let component_names: Vec<String> = components.iter().map(|c| c.name.clone()).collect();
        match term_type {
            // Core Relationship Operators
            TermType::Negation => format!("(--, {})", component_names[0]),
            TermType::Inheritance => format!("({} --> {})", component_names[0], component_names[1]),
            TermType::Similarity => format!("({} <-> {})", component_names[0], component_names[1]),
            TermType::Implication => format!("({} ==> {})", component_names[0], component_names[1]),
            TermType::Equivalence => format!("({} <=> {})", component_names[0], component_names[1]),
            TermType::Conjunction => format!("(&, {})", component_names.join(", ")),
            TermType::Disjunction => format!("(|, {})", component_names.join(", ")),
            TermType::SequentialConjunction => format!("(&/, {}, {})", component_names[0], component_names[1]),
            TermType::Operation => format!("({} ^ {})", component_names[0], component_names[1]),
            TermType::Product => format!("({})", component_names.join(", ")),

            // Set and Property Operators
            TermType::Instance => format!("({} {{-- {})", component_names[0], component_names[1]),
            TermType::Property => format!("({} --}} {})", component_names[0], component_names[1]),
            TermType::ExtensionalSet => format!("{{{}}}", component_names.join(", ")),
            TermType::IntensionalSet => format!("[{}]", component_names.join(", ")),

            // Fallback for any unimplemented or atomic types
            _ => format!("({:?}, {})", term_type, component_names.join(", ")),
        }
    }

    /// Creates a new simplified and canonical compound term.
    /// This is the primary factory method for creating all compound terms. It applies
    /// simplification and canonicalization rules recursively until a fixed point is reached.
    pub fn create_compound(term_type: TermType, components: Vec<Arc<Term>>) -> Arc<Term> {
        Term::simplify_and_construct(term_type, components)
    }

    /// Internal recursive function to simplify and construct a term.
    /// It applies one layer of simplification rules and calls itself with the
    /// simplified parts. If no more simplifications can be applied, it constructs
    /// and returns the final term.
    fn simplify_and_construct(
        term_type: TermType,
        mut components: Vec<Arc<Term>>,
    ) -> Arc<Term> {
        // Rule 1: Associativity (Flattening).
        if term_type == TermType::Conjunction || term_type == TermType::Disjunction {
            if components.iter().any(|c| c.term_type == term_type) {
                let new_components = components.into_iter().flat_map(|c| {
                    if c.term_type == term_type { c.components.as_ref().unwrap().clone() } else { vec![c] }
                }).collect();
                return Term::simplify_and_construct(term_type, new_components);
            }
        }

        // Rule 2: Commutativity (Sorting) and Idempotency (Deduplication).
        let is_commutative = matches!(term_type, TermType::Conjunction | TermType::Disjunction | TermType::Similarity | TermType::Equivalence);
        if is_commutative {
            let original_len = components.len();
            components.sort_by(|a, b| a.name.cmp(&b.name));
            components.dedup_by(|a, b| a.hash == b.hash);
            if components.len() < original_len {
                return Term::simplify_and_construct(term_type, components);
            }
        }

        // Rule 3: Contradiction Elimination (for conjunctions).
        // Example: (&, A, B, --A) -> (&, B).
        if term_type == TermType::Conjunction {
            let mut to_remove = std::collections::HashSet::new();
            for i in 0..components.len() {
                for j in (i + 1)..components.len() {
                    let c1 = &components[i];
                    let c2 = &components[j];
                    if (c1.term_type == TermType::Negation && c1.components.as_ref().unwrap()[0].hash == c2.hash) ||
                       (c2.term_type == TermType::Negation && c2.components.as_ref().unwrap()[0].hash == c1.hash) {
                        to_remove.insert(i);
                        to_remove.insert(j);
                    }
                }
            }
            if !to_remove.is_empty() {
                let new_components = components.into_iter().enumerate()
                    .filter(|(i, _)| !to_remove.contains(i))
                    .map(|(_, c)| c)
                    .collect::<Vec<_>>();
                // Avoid creating an empty conjunction `(&,)`, as the system has no FALSE term.
                if !new_components.is_empty() {
                    return Term::simplify_and_construct(term_type, new_components);
                }
            }
        }

        // Rule 4: Absorption Laws.
        // (&, A, (|, A, B)) -> A; (|, A, (&, A, B)) -> A
        let absorbing_op = if term_type == TermType::Conjunction { Some(TermType::Disjunction) } else if term_type == TermType::Disjunction { Some(TermType::Conjunction) } else { None };
        if let Some(op) = absorbing_op {
            let mut absorbed_indices = std::collections::HashSet::new();
            for i in 0..components.len() {
                for j in 0..components.len() {
                    if i == j { continue; }
                    let absorber = &components[i];
                    let maybe_absorbed = &components[j];
                    if maybe_absorbed.term_type == op && maybe_absorbed.components.as_ref().unwrap().contains(absorber) {
                        absorbed_indices.insert(j);
                    }
                }
            }
            if !absorbed_indices.is_empty() {
                let new_components = components.into_iter().enumerate()
                    .filter(|(i, _)| !absorbed_indices.contains(i))
                    .map(|(_, c)| c)
                    .collect();
                return Term::simplify_and_construct(term_type, new_components);
            }
        }

        // Rule 5: Double Negation and De Morgan's Laws.
        if term_type == TermType::Negation {
            let component = &components[0];
            // Double Negation: (--, (--, A)) -> A
            if component.term_type == TermType::Negation {
                return component.components.as_ref().unwrap()[0].clone();
            }
            // De Morgan's Law: (--, (&, A, B)) -> (|, (--, A), (--, B))
            if component.term_type == TermType::Conjunction {
                let new_components = component.components.as_ref().unwrap().iter()
                    .map(|c| Term::create_compound(TermType::Negation, vec![c.clone()]))
                    .collect();
                return Term::create_compound(TermType::Disjunction, new_components);
            }
            // De Morgan's Law: (--, (|, A, B)) -> (&, (--, A), (--, B))
            if component.term_type == TermType::Disjunction {
                let new_components = component.components.as_ref().unwrap().iter()
                    .map(|c| Term::create_compound(TermType::Negation, vec![c.clone()]))
                    .collect();
                return Term::create_compound(TermType::Conjunction, new_components);
            }
        }

        // Rule 6: Distributive Law (DISABLED due to infinite loop risk).
        // (&, A, (|, B, C)) -> (|, (&, A, B), (&, A, C))
        /*
        if term_type == TermType::Conjunction {
            if let Some((i, disj)) = components.iter().enumerate().find(|(_, c)| c.term_type == TermType::Disjunction) {
                let mut others = components.clone();
                others.remove(i);
                if !others.is_empty() {
                    let new_disj_comps = disj.components.as_ref().unwrap().iter().map(|disj_comp| {
                        let mut new_conj_comps = others.clone();
                        new_conj_comps.push(disj_comp.clone());
                        Term::create_compound(TermType::Conjunction, new_conj_comps)
                    }).collect();
                    return Term::create_compound(TermType::Disjunction, new_disj_comps);
                }
            }
        }
        */

        // Rule 7: 1-ary Reduction.
        if (term_type == TermType::Conjunction || term_type == TermType::Disjunction) && components.len() == 1 {
            return components.remove(0);
        }

        // Base Case: No more simplifications can be applied. Construct the final term.
        let name = Term::generate_name(&term_type, &components);
        let final_hash = Term::compute_hash(&name, &term_type, &Some(components.clone()));

        Arc::new(Term::create_compound_raw(
            name,
            term_type,
            components,
            final_hash,
        ))
    }

    /// Creates a new atomic term.
    pub fn new_atom(name: &str) -> Arc<Term> {
        let term_type = TermType::Atom;
        let hash = Term::compute_hash(name, &term_type, &None);
        Arc::new(Term {
            name: name.to_string(),
            term_type,
            complexity: 1,
            subject: None,
            predicate: None,
            components: None,
            hash,
        })
    }

    /// Creates a new compound term. This is a "raw" constructor.
    /// It assumes that simplification and canonicalization have already been applied.
    pub(crate) fn create_compound_raw(
        name: String,
        term_type: TermType,
        components: Vec<Arc<Term>>,
        hash: String,
    ) -> Self {
        let complexity = 1 + components.iter().map(|c| c.complexity).sum::<u64>();
        let (subject, predicate) = if components.len() == 2 {
            (Some(components[0].clone()), Some(components[1].clone()))
        } else {
            (None, None)
        };

        Term {
            name,
            term_type,
            complexity,
            subject,
            predicate,
            components: Some(components),
            hash,
        }
    }
}

/// Implements the Display trait so the term can be printed in its Narsese form.
impl fmt::Display for Term {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name)
    }
}

/// Implements Hash, allowing `Term` to be used in hash-based collections like `HashSet`.
/// The hash is based on the pre-computed `hash` field for efficiency.
impl Hash for Term {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.hash.hash(state);
    }
}

/// Implements PartialEq, defining equality based on the content hash.
/// Two terms are equal if and only if their hashes are identical.
impl PartialEq for Term {
    fn eq(&self, other: &Self) -> bool {
        self.hash == other.hash
    }
}

/// Implements Eq, marking that `Term` has a total equivalence relation.
impl Eq for Term {}

/// A helper module for `serde` to handle the custom serialization and deserialization
/// of `Arc<Term>`. This is used with the `#[serde(with = "...")]` attribute.
pub mod arc_term_serde {
    use super::*;
    use serde::{de::Error, Deserializer, Serializer};

    /// Serializes an `Arc<Term>` into its Narsese string representation.
    pub fn serialize<S>(term: &Arc<Term>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&term.name)
    }

    /// Deserializes an `Arc<Term>` from its Narsese string representation.
    ///
    /// This re-uses the main system parser to ensure that the reconstructed
    /// term is canonical and shared, just like any other term created at runtime.
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Arc<Term>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        parser::parse_term(&s).map_err(D::Error::custom)
    }
}

// All tests related to term creation and simplification will be moved to `src/memory/tests.rs`
// to reflect that this logic is now owned by the `Memory` component.