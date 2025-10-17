import { Term, TermType } from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*']);

/**
 * Creates and normalizes Term instances with caching.
 * Implements canonical representation as specified in DESIGN.md.
 */
export class TermFactory {
  constructor() {
    this._cache = new Map();
  }

  create(termData) {
    const { operator, components } = this.normalize(termData);
    const name = this.buildCanonicalName(operator, components);

    if (this._cache.has(name)) {
      return this._cache.get(name);
    }

    const type = operator ? TermType.COMPOUND : TermType.ATOM;
    const newTerm = new Term(type, name, components, operator);
    
    this._cache.set(name, newTerm);
    return newTerm;
  }

  normalize({ operator, components }) {
    // 1. Recursively normalize all sub-terms
    let normalizedComponents = components.map(comp =>
      (typeof comp === 'string' || comp instanceof Term) ? comp : this.create(comp)
    );

    // 2. Apply operator rules
    if (operator) {
      // Commutativity: sort components
      if (COMMUTATIVE_OPERATORS.has(operator)) {
        normalizedComponents.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Associativity: flatten nested structures
      if (operator === '&' || operator === '|') {
        normalizedComponents = this.flatten(operator, normalizedComponents);
      }

      // Commutativity: sort components
      if (COMMUTATIVE_OPERATORS.has(operator)) {
        normalizedComponents.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Redundancy: remove duplicates
      normalizedComponents = this.removeRedundancy(normalizedComponents);
    }

    return { operator, components: normalizedComponents };
  }

  flatten(operator, components) {
    const flattened = [];
    for (const comp of components) {
      if (comp.operator === operator) {
        flattened.push(...comp.components);
      } else {
        flattened.push(comp);
      }
    }
    return flattened;
  }

  removeRedundancy(components) {
    const seen = new Set();
    return components.filter(comp => {
      if (seen.has(comp.name)) {
        return false;
      }
      seen.add(comp.name);
      return true;
    });
  }

  buildCanonicalName(operator, components) {
    if (!operator) {
      return components[0].toString();
    }
    const componentNames = components.map(c => c.name).join(', ');
    return `(${operator}, ${componentNames})`;
  }
}