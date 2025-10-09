import { Term } from './Term.js';

// Concept class - represents the system's internal understanding of a Term
// Bundles the immutable Term with metadata that can change over time
export class Concept {
  constructor({ term, createdAt = Date.now(), embedding = null, activation = 0.0 } = {}) {
    this.term = term;
    this.createdAt = createdAt;
    this.embedding = embedding;  // Semantic embedding vector for neural-symbolic integration
    this.activation = activation; // Activation level of the concept
    this.accessedAt = createdAt; // Timestamp of last access
  }

  // Factory method to create a new concept
  static new(term, createdAt = Date.now()) {
    return new Concept({ 
      term, 
      createdAt,
      embedding: null
    });
  }

  // Update access time
  touch() {
    this.accessedAt = Date.now();
    return this;
  }

  // Update activation level
  updateActivation(newActivation) {
    this.activation = Math.max(0, Math.min(1, newActivation)); // Clamp between 0 and 1
    return this;
  }

  // Override valueOf and toJSON for proper serialization
  valueOf() {
    return this.term.name;
  }

  toJSON() {
    return {
      term: this.term,
      createdAt: this.createdAt,
      embedding: this.embedding,
      activation: this.activation,
      accessedAt: this.accessedAt
    };
  }

  // Check equality based on term hash (canonical representation)
  equals(other) {
    if (!(other instanceof Concept)) return false;
    return this.term.hash === other.term.hash;
  }

  // Strict equality for debugging
  deepEquals(other) {
    if (!(other instanceof Concept)) return false;
    return this.term.hash === other.term.hash &&
           this.createdAt === other.createdAt &&
           this.activation === other.activation &&
           this.accessedAt === other.accessedAt &&
           // Compare embeddings if they exist
           ((this.embedding === null && other.embedding === null) ||
            (this.embedding && other.embedding && 
             this.embedding.length === other.embedding.length &&
             this.embedding.every((val, idx) => val === other.embedding[idx])));
  }
}