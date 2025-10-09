import { Term, TermType } from './Term.js';
import { Punctuation } from './Punctuation.js';
import { TruthValue } from './TruthValue.js';
import { Task } from './Task.js';
import { Concept } from './Concept.js';

// Static cache for canonical terms to avoid recreating identical terms
class TermCache {
  constructor() {
    this.terms = new Map(); // hash -> Term mapping
  }

  get(hash) {
    return this.terms.get(hash);
  }

  set(hash, term) {
    this.terms.set(hash, term);
  }

  clear() {
    this.terms.clear();
  }
}

// Create a global term cache instance
const termCache = new TermCache();

// Enhanced Term class with caching
export class CachedTerm extends Term {
  // Override createCompound to use caching
  static createCompound(termType, components) {
    // Generate the input key for cache lookup
    const componentHashes = components.map(c => c.hash).join('|');
    const cacheKey = `${termType}-${componentHashes}`;
    
    // Try to get from cache first
    let cachedTerm = termCache.get(cacheKey);
    if (cachedTerm) {
      return cachedTerm;
    }
    
    // Create new term if not in cache
    const newTerm = Term.simplifyAndConstruct(termType, components);
    
    // Cache the result
    termCache.set(newTerm.hash, newTerm);
    return newTerm;
  }

  // Override newAtom to use caching
  static newAtom(name) {
    const cacheKey = `Atom-${name}`;
    let cachedTerm = termCache.get(cacheKey);
    if (cachedTerm && cachedTerm.name === name) {
      return cachedTerm;
    }
    
    const newTerm = super.newAtom(name);
    termCache.set(newTerm.hash, newTerm);
    return newTerm;
  }
}

// Export the cached version as main Term
export { TermType, Punctuation, TruthValue, Task, Concept };