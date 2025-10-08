use super::term_type::TermType;
use std::collections::hash_map::DefaultHasher;
use std::fmt;
use std::hash::{Hash, Hasher};
use std::sync::Arc;

/// Represents a term in the SeNARS system, the fundamental unit of knowledge.
///
/// `Term` is designed to be immutable, with its identity defined by its content hash.
/// This allows for efficient storage and retrieval in memory.
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
    /// The semantic embedding vector for the term, used for neural-symbolic integration.
    pub embedding: Option<Vec<f32>>,
    /// The timestamp (ms) of when the term was created.
    pub created_at: u64,
    /// A unique hash identifying the term's content, used for equality checks and hashing.
    pub hash: String,
}

impl Term {
    /// Computes a SHA256 hash for the term's identifying components.
    fn compute_hash(name: &str, term_type: &TermType, components: &Option<Vec<Arc<Term>>>) -> String {
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

    /// Generates a name for a compound term based on its type and components.
    /// This is the standard Narsese representation, as defined in `SPECIFICATION.md`.
    fn generate_name(term_type: &TermType, components: &[Arc<Term>]) -> String {
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

    /// Creates a new atomic term (a term with no internal structure).
    pub fn new_atom(name: &str) -> Self {
        let term_type = TermType::Atom;
        let hash = Term::compute_hash(name, &term_type, &None);
        Term {
            name: name.to_string(),
            term_type,
            complexity: 1,
            subject: None,
            predicate: None,
            components: None,
            embedding: None,
            created_at: 0, // To be set by the memory system upon creation.
            hash,
        }
    }

    /// Creates a new compound term from its constituent components.
    /// This function handles algebraic simplification rules and may return an existing term.
    pub fn create_compound(term_type: TermType, mut components: Vec<Arc<Term>>) -> Arc<Term> {
        // --- Algebraic simplification rules ---

        // 1. Associativity (Flattening) for n-ary operators
        if term_type == TermType::Conjunction || term_type == TermType::Disjunction {
            let mut flattened_components = Vec::new();
            for comp in components {
                // If a component is of the same n-ary type, flatten its components.
                if comp.term_type == term_type {
                    if let Some(sub_comps) = &comp.components {
                        flattened_components.extend(sub_comps.clone());
                    }
                } else {
                    flattened_components.push(comp);
                }
            }
            components = flattened_components;
        }

        // 2. Commutativity (Sorting) and Idempotency (Deduplication)
        let is_commutative = matches!(
            term_type,
            TermType::Conjunction | TermType::Disjunction | TermType::Similarity | TermType::Equivalence
        );

        if is_commutative {
            // Sort by name to get a predictable, alphabetical canonical order.
            components.sort_by(|a, b| a.name.cmp(&b.name));
            // Remove duplicates. This works because sorting brings duplicates together.
            components.dedup(); // Relies on Term's PartialEq implementation.
        }

        // --- Logical reduction rules ---

        // 1. 1-ary Reduction for Conjunction and Disjunction
        if (term_type == TermType::Conjunction || term_type == TermType::Disjunction) && components.len() == 1 {
            // If only one component remains after simplification, return it directly.
            return components.pop().unwrap();
        }

        // 2. Double Negation Reduction: (--, (--, A)) => A
        if term_type == TermType::Negation {
            if let Some(component) = components.first() {
                if component.term_type == TermType::Negation {
                    // Return the "grandchild" term directly.
                    return component.components.as_ref().unwrap()[0].clone();
                }
            }
        }

        // --- End of simplification and reduction rules ---

        // The rest of the function remains the same, operating on the final component list.
        let complexity = 1 + components.iter().map(|c| c.complexity).sum::<u64>();
        let name = Term::generate_name(&term_type, &components);
        let hash = Term::compute_hash(&name, &term_type, &Some(components.clone()));

        // For binary relations, assign subject and predicate for convenience.
        let (subject, predicate) = if components.len() == 2 {
            (Some(components[0].clone()), Some(components[1].clone()))
        } else {
            (None, None)
        };

        Arc::new(Term {
            name,
            term_type,
            complexity,
            subject,
            predicate,
            components: Some(components),
            embedding: None,
            created_at: 0,
            hash,
        })
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    /// Helper function to create an `Arc<Term>` for an atomic term.
    fn atom(name: &str) -> Arc<Term> {
        Arc::new(Term::new_atom(name))
    }

    #[test]
    fn test_n_ary_conjunction_creation_and_naming() {
        let a = atom("A");
        let b = atom("B");
        let c = atom("C");
        // Components are sorted by hash, so the name is canonical.
        let term = Term::create_compound(TermType::Conjunction, vec![c, a, b]);
        assert_eq!(term.name, "(&, A, B, C)");
        assert_eq!(term.components.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_commutative_sorting_for_conjunction() {
        let a = atom("A");
        let b = atom("B");
        let term1 = Term::create_compound(TermType::Conjunction, vec![a.clone(), b.clone()]);
        let term2 = Term::create_compound(TermType::Conjunction, vec![b.clone(), a.clone()]);

        // Hashes and names should be identical due to canonical sorting.
        assert_eq!(term1.hash, term2.hash);
        assert_eq!(term1.name, "(&, A, B)");
    }

    #[test]
    fn test_commutative_sorting_for_equivalence() {
        let a = atom("A");
        let b = atom("B");
        let term1 = Term::create_compound(TermType::Equivalence, vec![a.clone(), b.clone()]);
        let term2 = Term::create_compound(TermType::Equivalence, vec![b.clone(), a.clone()]);

        // Hashes should be identical. Name depends on component order.
        assert_eq!(term1.hash, term2.hash);
    }

    #[test]
    fn test_idempotency_deduplication() {
        let a = atom("A");
        let b = atom("B");
        let term = Term::create_compound(TermType::Conjunction, vec![a.clone(), b.clone(), a.clone()]);

        // Duplicate 'A' should be removed.
        assert_eq!(term.name, "(&, A, B)");
        assert_eq!(term.components.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_associativity_flattening() {
        let a = atom("A");
        let b = atom("B");
        let c = atom("C");
        let inner_conj = Term::create_compound(TermType::Conjunction, vec![b, c]);
        let outer_conj = Term::create_compound(TermType::Conjunction, vec![a, inner_conj]);

        // Nested conjunction should be flattened.
        assert_eq!(outer_conj.name, "(&, A, B, C)");
        assert_eq!(outer_conj.components.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_1_ary_reduction() {
        let a = atom("A");
        // A conjunction with a single component should reduce to the component itself.
        let term = Term::create_compound(TermType::Conjunction, vec![a.clone()]);

        assert_eq!(term.hash, a.hash);
        assert_eq!(term.name, "A");
    }

    #[test]
    fn test_double_negation_reduction() {
        let a = atom("A");
        let neg_a = Term::create_compound(TermType::Negation, vec![a.clone()]);
        let double_neg_a = Term::create_compound(TermType::Negation, vec![neg_a]);

        // (--, (--, A)) should reduce to A.
        assert_eq!(double_neg_a.hash, a.hash);
        assert_eq!(double_neg_a.name, "A");
    }

    #[test]
    fn test_complex_simplification_and_canonicalization() {
        let a = atom("A");
        let b = atom("B");
        let c = atom("C");

        // A complex term with nesting, redundancy, and non-canonical order.
        // (&, C, (&, B, A), A)
        let inner_conj = Term::create_compound(TermType::Conjunction, vec![b.clone(), a.clone()]);
        let term = Term::create_compound(TermType::Conjunction, vec![c.clone(), inner_conj, a.clone()]);

        // Expected canonical form: (&, A, B, C)
        // 1. Flattening: [C, B, A, A]
        // 2. Sorting:    [A, A, B, C] (based on hash)
        // 3. Deduplication: [A, B, C]
        assert_eq!(term.name, "(&, A, B, C)");
        assert_eq!(term.components.as_ref().unwrap().len(), 3);

        // Verify the final component order is correct.
        let component_names: Vec<_> = term.components.as_ref().unwrap().iter().map(|c| c.name.as_str()).collect();
        assert_eq!(component_names, vec!["A", "B", "C"]);
    }
}