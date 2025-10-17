/**
 * TermFactory - Creates and normalizes Term instances with caching
 * Implements canonical representation as specified in DESIGN.md
 */
import { Term } from './Term.js';

export class TermFactory {
  constructor() {
    // Cache for canonical terms to ensure object identity
    this._cache = new Map();
  }
  
  create(termExpression) {
    // Handle different input types: string, object, array
    const canonicalForm = this.normalize(termExpression);
    const cacheKey = this.generateCacheKey(canonicalForm);
    
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }
    
    const newTerm = new Term(canonicalForm.components, canonicalForm.operator);
    this._cache.set(cacheKey, newTerm);
    return newTerm;
  }
  
  normalize(termExpression) {
    // Placeholder implementation - would have full normalization logic
    if (typeof termExpression === 'string') {
      // Parse string to structured form
      return this.parseString(termExpression);
    }
    
    // For now, just return as-is
    return termExpression;
  }
  
  generateCacheKey(canonicalForm) {
    // Generate a unique key for caching
    return JSON.stringify(canonicalForm);
  }
  
  parseString(narseseString) {
    // Simple parsing logic for basic terms
    // Handle parentheses for compound terms
    const trimmed = narseseString.trim();

    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      // Compound term: (operator, term1, term2, ...)
      const inner = trimmed.slice(1, -1);
      const parts = this._simpleTokenize(inner);

      if (parts.length >= 3) {
        const operator = parts[0];
        const components = parts.slice(1).map(comp => this._parseComponent(comp));
        return { components, operator };
      }
    }

    // Atomic term or simple conjunction
    const parts = this._simpleTokenize(trimmed);
    if (parts.length === 1) {
      return { components: [parts[0]], operator: null };
    } else {
      // Multiple terms - treat as conjunction
      return { components: parts, operator: '&' };
    }
  }

  _simpleTokenize(str) {
    // Simple tokenization by comma and space
    return str.split(',').map(part => part.trim()).filter(part => part.length > 0);
  }

  _parseComponent(compStr) {
    // For now, just return the string as-is
    // In a full implementation, this would recursively parse
    return compStr;
  }
  
  applyOperatorRules(operator, components) {
    // Placeholder for normalization logic (commutativity, associativity, etc.)
    switch (operator) {
      case '&': // Conjunction - commutative and associative
      case '|': // Disjunction - commutative and associative
        // Sort components for commutativity (placeholder)
        components.sort((a, b) => a.id.localeCompare(b.id));
        break;
      // Add other operator rules
    }
    return components;
  }
}