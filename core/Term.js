import { CryptoUtils } from './base/utilities.js';

export const TermType = {
  // Core Relationship Operators
  NEGATION: 'negation',
  PRODUCT: 'product',
  INHERITANCE: 'inheritance',
  SIMILARITY: 'similarity',
  IMPLICATION: 'implication',
  EQUIVALENCE: 'equivalence',
  CONJUNCTION: 'conjunction',
  DISJUNCTION: 'disjunction',
  SEQUENTIAL_CONJUNCTION: 'sequential_conjunction',
  OPERATION: 'operation',

  // Set and Property Operators
  INSTANCE: 'instance',
  PROPERTY: 'property',
  EXTENSIONAL_SET: 'extensional_set',
  INTENSIONAL_SET: 'intensional_set',

  // Atomic term
  ATOM: 'atom'
};

export class Term {
  static newAtom(name) {
    const termType = TermType.ATOM;
    const hash = Term.computeHash(name, termType, null);
    return new Term({
      name,
      termType,
      complexity: 1,
      subject: null,
      predicate: null,
      components: null,
      hash
    });
  }

  static createCompound(termType, components) {
    const simplifiedComponents = Term.simplifyComponents(termType, [...components]);
    const name = Term.generateName(termType, simplifiedComponents);
    const hash = Term.computeHash(name, termType, simplifiedComponents);
    const complexity = 1 + simplifiedComponents.reduce((sum, comp) => sum + comp.complexity, 0);

    const hasSubjectPredicate = [TermType.INHERITANCE, TermType.SIMILARITY, TermType.IMPLICATION,
         TermType.EQUIVALENCE, TermType.SEQUENTIAL_CONJUNCTION, TermType.INSTANCE,
         TermType.PROPERTY, TermType.OPERATION].includes(termType) &&
        simplifiedComponents.length === 2;

    const subject = hasSubjectPredicate ? simplifiedComponents[0] : null;
    const predicate = hasSubjectPredicate ? simplifiedComponents[1] : null;

    return new Term({
      name,
      termType,
      complexity,
      subject,
      predicate,
      components: simplifiedComponents,
      hash
    });
  }

  constructor({ name, termType, complexity, subject, predicate, components, hash }) {
    this.name = name;
    this.termType = termType;
    this.complexity = complexity;
    this.subject = subject;
    this.predicate = predicate;
    this.components = components;
    this.hash = hash;
    Object.freeze(this);
  }

  static computeHash(name, termType, components) {
    const content = `${name}|${termType}|${components ? components.map(c => c.hash).join(',') : ''}`;
    return CryptoUtils.sha256(content);
  }

  static generateName(termType, components) {
    const [first, second] = components.map(comp => comp.name);
    const names = components.map(comp => comp.name);

    const patterns = {
      [TermType.NEGATION]: `(--, ${first})`,
      [TermType.INHERITANCE]: `(${first} --> ${second})`,
      [TermType.SIMILARITY]: `(${first} <-> ${second})`,
      [TermType.IMPLICATION]: `(${first} ==> ${second})`,
      [TermType.EQUIVALENCE]: `(${first} <=> ${second})`,
      [TermType.CONJUNCTION]: `(&, ${names.join(', ')})`,
      [TermType.DISJUNCTION]: `(|, ${names.join(', ')})`,
      [TermType.SEQUENTIAL_CONJUNCTION]: `(&/, ${first}, ${second})`,
      [TermType.OPERATION]: `(${first} ^ ${second})`,
      [TermType.PRODUCT]: `(${names.join(', ')})`,
      [TermType.INSTANCE]: `(${first} {{-- ${second})`,
      [TermType.PROPERTY]: `(${first} --}} ${second})`,
      [TermType.EXTENSIONAL_SET]: `{${names.join(', ')}}`,
      [TermType.INTENSIONAL_SET]: `[${names.join(', ')}]`
    };

    return patterns[termType] || `(${termType}, ${names.join(', ')})`;
  }

  static simplifyComponents(termType, components) {
    const ASSOCIATIVE_OPERATORS = [TermType.CONJUNCTION, TermType.DISJUNCTION];
    const COMMUTATIVE_OPERATORS = [TermType.CONJUNCTION, TermType.DISJUNCTION, TermType.SIMILARITY, TermType.EQUIVALENCE];

    let simplified = true;
    let currentComponents = [...components];

    while (simplified) {
      simplified = false;

      // Apply flattening for associative operators (conjunction, disjunction)
      if (ASSOCIATIVE_OPERATORS.includes(termType)) {
        let flattened = [];
        for (const comp of currentComponents) {
          if (comp.termType === termType && comp.components) {
            flattened.push(...comp.components);
            simplified = true;
          } else {
            flattened.push(comp);
          }
        }
        currentComponents = flattened;
      }

      // Apply sorting and deduplication for commutative operators
      if (COMMUTATIVE_OPERATORS.includes(termType)) {
        // Sort lexicographically by hash to ensure canonical form
        currentComponents.sort((a, b) => a.hash.localeCompare(b.hash));

        // Remove duplicates efficiently using a Set based on hash
        const seenHashes = new Set();
        const uniqueComponents = currentComponents.filter(comp => {
          if (seenHashes.has(comp.hash)) return false;
          seenHashes.add(comp.hash);
          return true;
        });

        if (uniqueComponents.length !== currentComponents.length) {
          simplified = true;
          currentComponents = uniqueComponents;
        }
      }
    }

    return currentComponents;
  }

  toString() {
    return this.name;
  }

  equals(other) {
    return other instanceof Term && this.hash === other.hash;
  }
}