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
    const names = components.map(comp => comp.name);
    
    switch (termType) {
      case TermType.NEGATION:
        return `(--, ${names[0]})`;
      case TermType.INHERITANCE:
        return `(${names[0]} --> ${names[1]})`;
      case TermType.SIMILARITY:
        return `(${names[0]} <-> ${names[1]})`;
      case TermType.IMPLICATION:
        return `(${names[0]} ==> ${names[1]})`;
      case TermType.EQUIVALENCE:
        return `(${names[0]} <=> ${names[1]})`;
      case TermType.CONJUNCTION:
        return `(&, ${names.join(', ')})`;
      case TermType.DISJUNCTION:
        return `(|, ${names.join(', ')})`;
      case TermType.SEQUENTIAL_CONJUNCTION:
        return `(&/, ${names[0]}, ${names[1]})`;
      case TermType.OPERATION:
        return `(${names[0]} ^ ${names[1]})`;
      case TermType.PRODUCT:
        return `(${names.join(', ')})`;
      case TermType.INSTANCE:
        return `(${names[0]} {{-- ${names[1]})`;
      case TermType.PROPERTY:
        return `(${names[0]} --}} ${names[1]})`;
      case TermType.EXTENSIONAL_SET:
        return `{${names.join(', ')}}`;
      case TermType.INTENSIONAL_SET:
        return `[${names.join(', ')}]`;
      default:
        return `(${termType}, ${names.join(', ')})`;
    }
  }

  static simplifyComponents(termType, components) {
    let simplified = true;
    let currentComponents = [...components];
    
    while (simplified) {
      simplified = false;
      
      // Apply flattening for associative operators (conjunction, disjunction)
      if ([TermType.CONJUNCTION, TermType.DISJUNCTION].includes(termType)) {
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
      if ([TermType.CONJUNCTION, TermType.DISJUNCTION, TermType.SIMILARITY, TermType.EQUIVALENCE].includes(termType)) {
        // Sort lexicographically by hash to ensure canonical form
        currentComponents.sort((a, b) => a.hash.localeCompare(b.hash));
        
        // Remove duplicates with a more efficient approach
        const uniqueMap = new Map();
        for (const comp of currentComponents) {
          uniqueMap.set(comp.hash, comp);
        }
        const uniqueComponents = Array.from(uniqueMap.values());
        
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