import { Punctuation, punctuationEquals } from './Punctuation.js';
import { TruthValue } from './TruthValue.js';

// Task class - represents a task in the SeNARS system
export class Task {
  constructor({
    term,
    punctuation = Punctuation.Belief,
    truth = null,
    priority = 0.5,
    accessedAt = Date.now(),
    createdAt = Date.now(),
    occurrenceTime = null,
    expirationTime = null,
    derivationPath = null
  } = {}) {
    this.term = term;
    this.punctuation = punctuation;
    this.truth = truth;
    this.priority = priority;
    this.accessedAt = accessedAt;
    this.createdAt = createdAt;
    this.occurrenceTime = occurrenceTime;
    this.expirationTime = expirationTime;
    this.derivationPath = derivationPath;
  }

  // Factory method to create a new task
  static new(term, punctuation, truth, createdAt, occurrenceTime) {
    return new Task({
      term,
      punctuation,
      truth,
      priority: 0.5, // Default priority
      accessedAt: createdAt,
      createdAt,
      occurrenceTime: occurrenceTime !== undefined ? occurrenceTime : null,
      expirationTime: null,
      derivationPath: null
    });
  }

  // Getters for convenience
  getTerm() {
    return this.term;
  }

  getPriority() {
    return this.priority;
  }

  setPriority(newPriority) {
    this.priority = Math.max(0, Math.min(1, newPriority)); // Clamp between 0 and 1
  }

  getAccessedAt() {
    return this.accessedAt;
  }

  setAccessedAt(newTime) {
    this.accessedAt = newTime;
  }

  isBelief() {
    return this.punctuation === Punctuation.Belief;
  }

  isGoal() {
    return this.punctuation === Punctuation.Goal;
  }

  isQuestion() {
    return this.punctuation === Punctuation.Question;
  }

  isExpired(currentTime = Date.now()) {
    if (this.expirationTime !== null) {
      return currentTime > this.expirationTime;
    }
    return false;
  }

  // Override toString for Narsese representation
  toString() {
    const termStr = this.term.toString();
    const puncStr = this.punctuation;
    if (this.truth) {
      return `${termStr}${puncStr} ${this.truth}`;
    }
    return `${termStr}${puncStr}`;
  }

  // Override valueOf and toJSON for proper serialization
  valueOf() {
    return this.toString();
  }

  toJSON() {
    return {
      term: this.term,
      punctuation: this.punctuation,
      truth: this.truth,
      priority: this.priority,
      accessedAt: this.accessedAt,
      createdAt: this.createdAt,
      occurrenceTime: this.occurrenceTime,
      expirationTime: this.expirationTime,
      derivationPath: this.derivationPath
    };
  }

  // Check equality based on multiple properties (optimized)
  equals(other) {
    if (!(other instanceof Task)) return false;
    // Fast path: if terms have different hashes, they're not equal
    if (this.term.hash !== other.term.hash) return false;
    
    // Compare primitive properties first (fast)
    if (this.punctuation !== other.punctuation ||
        this.priority !== other.priority ||
        this.accessedAt !== other.accessedAt ||
        this.createdAt !== other.createdAt ||
        this.occurrenceTime !== other.occurrenceTime ||
        this.expirationTime !== other.expirationTime) {
      return false;
    }
    
    // Compare truth values
    if (this.truth !== other.truth) {
      if (this.truth === null || other.truth === null || 
          !this.truth.equals || !other.truth.equals ||
          !this.truth.equals(other.truth)) {
        return false;
      }
    }
    
    // Compare derivation paths efficiently
    if (this.derivationPath !== other.derivationPath) {
      if (this.derivationPath === null || other.derivationPath === null) return false;
      if (this.derivationPath.length !== other.derivationPath.length) return false;
      for (let i = 0; i < this.derivationPath.length; i++) {
        if (this.derivationPath[i] !== other.derivationPath[i]) return false;
      }
    }
    
    return true;
  }

  // Strict equality for debugging purposes
  deepEquals(other) {
    return this.equals(other);
  }
}