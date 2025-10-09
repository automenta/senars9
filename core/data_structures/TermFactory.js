import { Term, TermType } from './Term.js';
import { termManager } from './TermManager.js';

// Factory functions for creating canonical terms following AIKR principles
export const TermFactory = {
  // Create or get a canonical atomic term
  createAtomic(name) {
    return termManager.getOrCreateAtomic(name);
  },

  // Create or get a canonical compound term
  createCompound(termType, components) {
    return termManager.getOrCreateCompound(termType, components);
  },

  // Get term by hash if it exists in cache
  getTermByHash(hash) {
    return termManager.get(hash);
  },

  // Clear the term cache
  clearCache() {
    termManager.clear();
  },

  // Get cache size
  cacheSize() {
    return termManager.size();
  }
};

// Export the factory and TermType
export { TermType };