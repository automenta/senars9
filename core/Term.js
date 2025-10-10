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
    const namePatterns = {
      [TermType.NEGATION]: `(--, ${names[0]})`,
      [TermType.INHERITANCE]: `(${names[0]} --> ${names[1]})`,
      [TermType.SIMILARITY]: `(${names[0]} <-> ${names[1]})`,
      [TermType.IMPLICATION]: `(${names[0]} ==> ${names[1]})`,
      [TermType.EQUIVALENCE]: `(${names[0]} <=> ${names[1]})`,
      [TermType.CONJUNCTION]: `(&, ${names.join(', ')})`,
      [TermType.DISJUNCTION]: `(|, ${names.join(', ')})`,
      [TermType.SEQUENTIAL_CONJUNCTION]: `(&/, ${names[0]}, ${names[1]})`,
      [TermType.OPERATION]: `(${names[0]} ^ ${names[1]})`,
      [TermType.PRODUCT]: `(${names.join(', ')})`,
      [TermType.INSTANCE]: `(${names[0]} {{-- ${names[1]})`,
      [TermType.PROPERTY]: `(${names[0]} --}} ${names[1]})`,
      [TermType.EXTENSIONAL_SET]: `{${names.join(', ')}}`,
      [TermType.INTENSIONAL_SET]: `[${names.join(', ')}]`
    };
    
    return namePatterns[termType] || `(${termType}, ${names.join(', ')})`;
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