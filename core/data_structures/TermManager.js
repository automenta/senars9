import { Term, TermType } from './Term.js';

// LRU Map implementation for fixed-size caching following AIKR (Assumption of Insufficient Knowledge Resources) principles
class LRUCache {
  constructor(maxSize = 10000) { // Fixed size following AIKR principles - NARS continuously derives new tasks, so we must assume limited resources
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    const value = this.cache.get(key);
    // Move to end to mark as recently used
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used item (first in the map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
    return value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// TermManager handles canonicalization and caching of terms with fixed-size LRU cache
class TermManager {
  constructor(maxCacheSize = 10000) {
    this.termCache = new LRUCache(maxCacheSize); // Fixed size LRU cache for canonical terms following AIKR (Assumption of Insufficient Knowledge Resources) principles
  }

  // Get a canonical term by hash
  get(hash) {
    return this.termCache.get(hash);
  }

  // Store a canonical term
  set(term) {
    this.termCache.set(term.hash, term);
    return term;
  }

  // Create or get a canonical atomic term
  getOrCreateAtomic(name) {
    const termType = TermType.Atom;
    const candidateHash = new Term({ name, termType }).computeHash(name, termType, null);
    
    let existing = this.termCache.get(candidateHash);
    if (existing) {
      return existing;
    }
    
    const newTerm = Term.newAtom(name);
    this.termCache.set(newTerm.hash, newTerm);
    return newTerm;
  }

  // Create or get a canonical compound term
  getOrCreateCompound(termType, components) {
    // First try to find a term with these exact components
    const componentHashes = components.map(c => c.hash).join('|');
    const tempTerm = new Term({ 
      name: 'temp', 
      termType, 
      components 
    });
    const candidateHash = tempTerm.computeHash('temp', termType, components);
    
    // Check if we already have a canonical term with this hash
    let existing = this.termCache.get(candidateHash);
    if (existing) {
      return existing;
    }
    
    // Create new simplified term
    const newTerm = Term.createCompound(termType, components);
    
    // Store and return the canonical version
    this.termCache.set(newTerm.hash, newTerm);
    return newTerm;
  }

  clear() {
    this.termCache.clear();
  }

  size() {
    return this.termCache.size();
  }
}

// Singleton term manager instance with fixed size following AIKR principles
const termManager = new TermManager(10000);

export { termManager, TermManager };