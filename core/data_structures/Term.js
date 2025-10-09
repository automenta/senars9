import { DEFAULTS } from '../base/constants.js';
import { ObjectUtils } from '../base/utilities.js';
import { termManager } from './TermManager.js';

// TermType enum - representing the type of a term
export const TermType = Object.freeze({
  // Core Relationship Operators
  Negation: 'Negation',
  Product: 'Product', 
  Inheritance: 'Inheritance',
  Similarity: 'Similarity',
  Implication: 'Implication',
  Equivalence: 'Equivalence',
  Conjunction: 'Conjunction',
  Disjunction: 'Disjunction',
  SequentialConjunction: 'SequentialConjunction',
  Operation: 'Operation',

  // Set and Property Operators
  Instance: 'Instance',
  Property: 'Property',
  ExtensionalSet: 'ExtensionalSet',
  IntensionalSet: 'IntensionalSet',

  // Atomic term
  Atom: 'Atom'
});

// Term class - the fundamental unit of knowledge in the system
export class Term {
  constructor({ name, termType, complexity = 1, subject = null, predicate = null, components = null, hash } = {}) {
    this.name = name;
    this.termType = termType;
    this.complexity = complexity;
    this.subject = subject;
    this.predicate = predicate;
    this.components = components;
    this.hash = hash || this.computeHash(name, termType, components);
    
    // Ensure immutability of core properties
    Object.freeze(this);
  }

  // Computes a hash for the term using a more robust approach
  computeHash(name, termType, components) {
    // Create a deterministic string representation for hashing
    const componentsStr = components ? components.map(c => c.hash).sort().join(',') : '';
    const input = `${name}-${termType}-${componentsStr}`;
    
    // Simple but more robust hash function using multiple hash rounds
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) + input.charCodeAt(i); // hash * 33 + char
      hash = hash >>> 0; // Convert to 32-bit unsigned integer
    }
    return hash.toString(16); // Convert to hex string to avoid sign issues
  }

  // Creates a new atomic term
  static newAtom(name) {
    const termType = TermType.Atom;
    const hash = this.computeHashForAtom(name);
    return new Term({ 
      name, 
      termType, 
      complexity: 1, 
      hash 
    });
  }

  // Computes a hash for an atomic term
  static computeHashForAtom(name) {
    const termType = TermType.Atom;
    return new Term({ name, termType }).computeHash(name, termType, null);
  }

  // Generates a name for a compound term based on its type and components
  static generateName(termType, components) {
    const componentNames = components.map(c => c.name);
    switch (termType) {
      // Core Relationship Operators
      case TermType.Negation:
        return `(--, ${componentNames[0]})`;
      case TermType.Inheritance:
        return `(${componentNames[0]} --> ${componentNames[1]})`;
      case TermType.Similarity:
        return `(${componentNames[0]} <-> ${componentNames[1]})`;
      case TermType.Implication:
        return `(${componentNames[0]} ==> ${componentNames[1]})`;
      case TermType.Equivalence:
        return `(${componentNames[0]} <=> ${componentNames[1]})`;
      case TermType.Conjunction:
        return `(&, ${componentNames.join(', ')})`;
      case TermType.Disjunction:
        return `(|, ${componentNames.join(', ')})`;
      case TermType.SequentialConjunction:
        return `(&/, ${componentNames[0]}, ${componentNames[1]})`;
      case TermType.Operation:
        return `(${componentNames[0]} ^ ${componentNames[1]})`;
      case TermType.Product:
        return `(${componentNames.join(', ')})`;

      // Set and Property Operators
      case TermType.Instance:
        return `(${componentNames[0]} {{-- ${componentNames[1]})`;
      case TermType.Property:
        return `(${componentNames[0]} --}} ${componentNames[1]})`;
      case TermType.ExtensionalSet:
        return `{${componentNames.join(', ')}}`;
      case TermType.IntensionalSet:
        return `[${componentNames.join(', ')}]`;

      // Fallback for any unimplemented or atomic types
      default:
        return `(${termType}, ${componentNames.join(', ')})`;
    }
  }

  // Creates a new simplified and canonical compound term
  static createCompound(termType, components) {
    return Term.simplifyAndConstruct(termType, components);
  }

  // Internal recursive function to simplify and construct a term
  static simplifyAndConstruct(termType, components) {
    const originalComponents = [...components]; // Clone to avoid mutation
    let currentComponents = [...originalComponents];
    
    // Loop until no more simplifications can be applied
    while (true) {
      let simplified = false;
      
      // Apply rules that return a new set of components
      const componentRules = [
        Term.flattenAssociative,
        Term.sortAndDedupCommutative
      ];
      
      for (const rule of componentRules) {
        const newComponents = rule(termType, [...currentComponents]);
        if (newComponents) {
          currentComponents = newComponents;
          simplified = true;
        }
      }
      
      const contradictionResult = Term.eliminateContradiction(termType, currentComponents);
      if (contradictionResult) {
        currentComponents = contradictionResult;
        simplified = true;
      }
      
      const absorptionResult = Term.applyAbsorption(termType, currentComponents);
      if (absorptionResult) {
        currentComponents = absorptionResult;
        simplified = true;
      }
      
      // If component-based simplifications happened, restart the loop
      if (simplified) {
        continue;
      }
      
      // Apply rules that return a completely new term
      const negationResult = Term.applyNegationRules(termType, currentComponents);
      if (negationResult) {
        return negationResult; // This is a final transformation
      }
      
      const unaryResult = Term.reduceUnary(termType, [...currentComponents]);
      if (unaryResult) {
        return unaryResult; // This is a final transformation
      }
      
      // If we've gone through all rules and no simplifications occurred, break
      break;
    }
    
    // Base case: No more simplifications can be applied. Construct the final term.
    const name = Term.generateName(termType, currentComponents);
    const finalHash = new Term({ name, termType, components: currentComponents }).computeHash(name, termType, currentComponents);
    
    // Calculate complexity
    const complexity = 1 + currentComponents.reduce((sum, c) => sum + c.complexity, 0);
    
    // Assign subject and predicate based on term type
    let subject = null;
    let predicate = null;
    
    if ([TermType.Inheritance, TermType.Similarity, TermType.Implication, TermType.Equivalence, 
         TermType.SequentialConjunction, TermType.Instance, TermType.Property, TermType.Operation].includes(termType)
        && currentComponents.length >= 2) {
      subject = currentComponents[0];
      predicate = currentComponents[1];
    }
    
    return new Term({
      name,
      termType,
      complexity,
      subject,
      predicate,
      components: currentComponents,
      hash: finalHash
    });
  }

  // Rule 1: Associativity (Flattening) - flattens nested terms of the same associative type
  static flattenAssociative(termType, components) {
    if ((termType === TermType.Conjunction || termType === TermType.Disjunction) 
        && components.some(c => c.termType === termType)) {
      const newComponents = [];
      for (const c of components) {
        if (c.termType === termType && c.components) {
          newComponents.push(...c.components);
        } else {
          newComponents.push(c);
        }
      }
      return newComponents;
    }
    return null;
  }

  // Rule 2: Commutativity (Sorting) and Idempotency (Deduplication)
  static sortAndDedupCommutative(termType, components) {
    const isCommutative = [TermType.Conjunction, TermType.Disjunction, TermType.Similarity, TermType.Equivalence].includes(termType);
    if (isCommutative) {
      const originalHashes = components.map(c => c.hash);
      
      // Sort by name
      components.sort((a, b) => a.name.localeCompare(b.name));
      
      // Remove duplicates based on hash
      const uniqueComponents = [];
      const seenHashes = new Set();
      for (const comp of components) {
        if (!seenHashes.has(comp.hash)) {
          uniqueComponents.push(comp);
          seenHashes.add(comp.hash);
        }
      }
      
      const newHashes = uniqueComponents.map(c => c.hash);
      
      // If the sequence has changed, return the new list
      if (originalHashes.length !== newHashes.length || 
          originalHashes.some((hash, idx) => hash !== newHashes[idx])) {
        return uniqueComponents;
      }
    }
    return null;
  }

  // Rule 3: Contradiction Elimination for conjunctions
  static eliminateContradiction(termType, components) {
    if (termType === TermType.Conjunction) {
      const toRemove = new Set();
      
      for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
          const c1 = components[i];
          const c2 = components[j];
          
          if ((c1.termType === TermType.Negation && c1.components[0].hash === c2.hash) ||
              (c2.termType === TermType.Negation && c2.components[0].hash === c1.hash)) {
            toRemove.add(i);
            toRemove.add(j);
          }
        }
      }
      
      if (toRemove.size > 0) {
        const newComponents = components.filter((_, idx) => !toRemove.has(idx));
        // Avoid creating an empty conjunction
        if (newComponents.length > 0) {
          return newComponents;
        }
      }
    }
    return null;
  }

  // Rule 4: Absorption Laws
  static applyAbsorption(termType, components) {
    const absorbingOp = termType === TermType.Conjunction ? TermType.Disjunction : 
                       termType === TermType.Disjunction ? TermType.Conjunction : null;
    
    if (absorbingOp) {
      const absorbedIndices = new Set();
      
      for (let i = 0; i < components.length; i++) {
        for (let j = 0; j < components.length; j++) {
          if (i === j) continue;
          
          const absorber = components[i];
          const maybeAbsorbed = components[j];
          
          if (maybeAbsorbed.termType === absorbingOp && 
              maybeAbsorbed.components && 
              maybeAbsorbed.components.some(c => c.hash === absorber.hash)) {
            absorbedIndices.add(j);
          }
        }
      }
      
      if (absorbedIndices.size > 0) {
        return components.filter((_, idx) => !absorbedIndices.has(idx));
      }
    }
    return null;
  }

  // Rule 5: Double Negation and De Morgan's Laws
  static applyNegationRules(termType, components) {
    if (termType === TermType.Negation && components.length > 0) {
      const component = components[0];
      
      // Double Negation: (--, (--, A)) -> A
      if (component.termType === TermType.Negation && component.components) {
        return component.components[0];
      }
      
      // De Morgan's Law: (--, (&, A, B)) -> (|, (--, A), (--, B))
      if (component.termType === TermType.Conjunction && component.components) {
        const newComponents = component.components.map(c => 
          Term.createCompound(TermType.Negation, [c])
        );
        return Term.createCompound(TermType.Disjunction, newComponents);
      }
      
      // De Morgan's Law: (--, (|, A, B)) -> (&, (--, A), (--, B))
      if (component.termType === TermType.Disjunction && component.components) {
        const newComponents = component.components.map(c => 
          Term.createCompound(TermType.Negation, [c])
        );
        return Term.createCompound(TermType.Conjunction, newComponents);
      }
    }
    return null;
  }

  // Rule 7: 1-ary Reduction - reduces single-component conjunction/disjunction to its component
  static reduceUnary(termType, components) {
    if ((termType === TermType.Conjunction || termType === TermType.Disjunction) && components.length === 1) {
      return components[0];
    }
    return null;
  }

  // Creates a new compound term (raw constructor)
  static createCompoundRaw(name, termType, components, hash) {
    const complexity = 1 + components.reduce((sum, c) => sum + c.complexity, 0);
    
    // Assign subject and predicate based on term type
    let subject = null;
    let predicate = null;
    
    if ([TermType.Inheritance, TermType.Similarity, TermType.Implication, TermType.Equivalence, 
         TermType.SequentialConjunction, TermType.Instance, TermType.Property, TermType.Operation].includes(termType)
        && components.length >= 2) {
      subject = components[0];
      predicate = components[1];
    }
    
    return new Term({
      name,
      termType,
      complexity,
      subject,
      predicate,
      components,
      hash
    });
  }

  // Override toString for Narsese representation
  toString() {
    return this.name;
  }

  // Override valueOf and toJSON for proper serialization
  valueOf() {
    return this.name;
  }

  toJSON() {
    return this.name;
  }

  // Check equality based on hash (most efficient for canonical terms)
  equals(other) {
    if (!(other instanceof Term)) return false;
    // For canonical terms, hash equality is sufficient and most efficient
    return this.hash === other.hash;
  }

  // Strict equality that compares all properties (useful for debugging)
  deepEquals(other) {
    if (!(other instanceof Term)) return false;
    if (this.hash !== other.hash) return false; // Fast path using hash
    
    // Properties should be the same if hashes match for canonical terms
    return this.name === other.name && 
           this.termType === other.termType && 
           this.complexity === other.complexity &&
           this.subject === other.subject && 
           this.predicate === other.predicate &&
           this.components === other.components;
  }
}