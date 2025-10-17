/**
 * TermFactory - Creates and normalizes Term instances with caching
 * Implements canonical representation as specified in DESIGN.md
 */
 import { Term, TermType } from './Term.js';

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

    // Build the canonical name for the term
    const name = this._buildCanonicalName(canonicalForm);

    // Determine if this is an atomic or compound term
    const isAtomic = !canonicalForm.operator && canonicalForm.components.length === 1;
    const type = isAtomic ? TermType.ATOM : TermType.COMPOUND;

    const newTerm = new Term(type, name, canonicalForm.components, canonicalForm.operator);
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
    const trimmed = narseseString.trim();

    // Handle compound terms in parentheses
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const inner = trimmed.slice(1, -1).trim();

      // Check for infix operators: A --> B, A <-> B, etc.
      if (inner.includes(' --> ')) {
        const parts = inner.split(' --> ');
        if (parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '-->',
            components: [this._parseComponent(parts[0].trim()), this._parseComponent(parts[1].trim())]
          };
        }
      } else if (inner.includes(' <-> ')) {
        const parts = inner.split(' <-> ');
        if (parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '<->',
            components: [this._parseComponent(parts[0].trim()), this._parseComponent(parts[1].trim())]
          };
        }
      } else if (inner.includes(' ==> ')) {
        const parts = inner.split(' ==> ');
        if (parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '==>',
            components: [this._parseComponent(parts[0].trim()), this._parseComponent(parts[1].trim())]
          };
        }
      } else if (inner.includes(' <=> ')) {
        const parts = inner.split(' <=> ');
        if (parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '<=>',
            components: [this._parseComponent(parts[0].trim()), this._parseComponent(parts[1].trim())]
          };
        }
      }

      // Handle prefix operators: (&, A, B, C)
      const parts = this._parsePrefixOperator(inner);
      if (parts) {
        return parts;
      }

      throw new Error(`Invalid compound term syntax: ${trimmed}`);
    }

    // Atomic term - validate it's a reasonable atomic term
    if (this._isValidAtomicTerm(trimmed)) {
      return { components: [trimmed], operator: null };
    }

    throw new Error(`Invalid atomic term: ${trimmed}`);
  }

   _parsePrefixOperator(str) {
     // Handle prefix operators like (&, A, B, C)
     const parts = this._simpleTokenize(str);
     if (parts.length >= 2) {
       const operator = parts[0];
       const components = parts.slice(1).map(comp => this._parseComponent(comp));
       return { operator, components };
     }
     return null;
   }

   _buildCanonicalName(canonicalForm) {
     if (!canonicalForm.operator) {
       // Atomic term
       return canonicalForm.components[0];
     }

     // Build compound term name based on operator type
     if (['-->', '<->', '==>', '<=>'].includes(canonicalForm.operator)) {
       // Infix operators
       return `(${canonicalForm.components[0]} ${canonicalForm.operator} ${canonicalForm.components[1]})`;
     } else {
       // Prefix operators
       const componentStr = canonicalForm.components.join(', ');
       return `(${canonicalForm.operator}, ${componentStr})`;
     }
   }

   _validateComponents(parts) {
     return parts.every(part => part.trim().length > 0);
   }

   _isValidAtomicTerm(term) {
     // Valid atomic terms: words, quoted strings, variables
     const trimmed = term.trim();

     // Empty strings are invalid
     if (trimmed.length === 0) return false;

     // Check for quoted strings
     if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
         (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
       return trimmed.length > 1; // Must have content between quotes
     }

     // Check for variables (start with ? or $)
     if (trimmed.startsWith('?') || trimmed.startsWith('$')) {
       return trimmed.length > 1; // Must have name after ? or $
     }

     // Regular words: letters, numbers, hyphens, underscores
     return /^[a-zA-Z0-9_-]+$/.test(trimmed);
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