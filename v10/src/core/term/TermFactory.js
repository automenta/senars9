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
    
    // For compound terms, we need to convert string components to Term objects
    let components = canonicalForm.components;
    if (!isAtomic) {
      components = components.map(comp => {
        if (typeof comp === 'string') {
          // Recursively create Term object for string components
          return this.create(comp);
        } else {
          return comp; // Already a Term object (from recursive call)
        }
      });
    }

    const newTerm = new Term(type, name, components, canonicalForm.operator);
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
    
    // Skip whitespace and empty string validation here since parser handles it
    if (trimmed.length === 0) {
      throw new Error('Empty input string');
    }

    // Handle compound terms in parentheses
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const inner = trimmed.slice(1, -1).trim();

      // Check for infix operators: A --> B, A <-> B, etc.
      if (this._hasInfixOperator(inner, ' --> ')) {
        const parts = this._splitInfix(inner, ' --> ');
        if (parts && parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '-->',
            components: [this._createSubTerm(parts[0].trim()), this._createSubTerm(parts[1].trim())]
          };
        }
      } else if (this._hasInfixOperator(inner, ' <-> ')) {
        const parts = this._splitInfix(inner, ' <-> ');
        if (parts && parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '<->',
            components: [this._createSubTerm(parts[0].trim()), this._createSubTerm(parts[1].trim())]
          };
        }
      } else if (this._hasInfixOperator(inner, ' ==> ')) {
        const parts = this._splitInfix(inner, ' ==> ');
        if (parts && parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '==>',
            components: [this._createSubTerm(parts[0].trim()), this._createSubTerm(parts[1].trim())]
          };
        }
      } else if (this._hasInfixOperator(inner, ' <=> ')) {
        const parts = this._splitInfix(inner, ' <=> ');
        if (parts && parts.length === 2 && this._validateComponents(parts)) {
          return {
            operator: '<=>',
            components: [this._createSubTerm(parts[0].trim()), this._createSubTerm(parts[1].trim())]
          };
        }
      }

      // Handle prefix operators: (&, A, B, C)
      const prefixParts = this._parsePrefixOperator(inner);
      if (prefixParts) {
        return prefixParts;
      }

      throw new Error(`Invalid compound term syntax: ${trimmed}`);
    }

    // Atomic term - validate it's a reasonable atomic term
    if (this._isValidAtomicTerm(trimmed)) {
      return { components: [trimmed], operator: null };
    }

    throw new Error(`Invalid atomic term: ${trimmed}`);
  }

  _hasInfixOperator(str, operator) {
    // Check if the operator exists and is not inside nested parentheses
    let parenDepth = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') {
        parenDepth++;
      } else if (str[i] === ')') {
        parenDepth--;
      } else if (parenDepth === 0 && str.startsWith(operator, i)) {
        return true;
      }
    }
    return false;
  }

  _splitInfix(str, operator) {
    // Split on the operator while respecting parentheses
    const parts = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') {
        parenDepth++;
        current += str[i];
      } else if (str[i] === ')') {
        parenDepth--;
        current += str[i];
      } else if (parenDepth === 0 && str.startsWith(operator, i)) {
        parts.push(current);
        current = '';
        i += operator.length - 1; // Skip operator characters
      } else {
        current += str[i];
      }
    }
    
    if (current.length > 0) {
      parts.push(current);
    }
    
    return parts.length === 2 ? parts : null;
  }

  _parsePrefixOperator(str) {
    // Handle prefix operators like (&, A, B, C), (|, A, B, C), etc.
    const tokens = this._tokenizePrefix(str);
    if (tokens.length >= 1) {
      const operator = tokens[0];
      const components = tokens.slice(1).map(comp => this._createSubTerm(comp.trim()));
      return { operator, components };
    }
    return null;
  }

  _tokenizePrefix(str) {
    // Tokenize prefix operators with proper parentheses handling
    const tokens = [];
    let current = '';
    let parenDepth = 0;
    
    // First, find the operator (first part before comma or space)
    let i = 0;
    while (i < str.length && str[i] !== ' ' && str[i] !== ',') {
      current += str[i];
      i++;
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
      current = '';
    }
    
    // Now parse the remaining components, handling nested parentheses
    for (; i < str.length; i++) {
      const char = str[i];
      
      if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        parenDepth--;
        current += char;
      } else if (char === ',') {
        if (parenDepth === 0) {
          // End of current component
          if (current.trim()) {
            tokens.push(current.trim());
          }
          current = '';
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
    }
    
    return tokens;
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

  _createSubTerm(subTermStr) {
    // Recursively parse sub-terms and return Term objects
    // This should create and return actual Term objects, not just the parsed form
    return this.create(subTermStr);
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