import { Term } from './Term.js';

export class Concept {
  constructor(term, createdAt, activationLevel = 0.0, accessedAt = null) {
    this.term = term;
    this.createdAt = createdAt;
    this.accessedAt = accessedAt || createdAt;
    this.activationLevel = activationLevel;
    this.triggers = new Set();
    this.derivations = new Set();
    this.truths = new Map();
    this.resources = new Map();
  }

  static create(term, createdAt, activationLevel = 0.0) {
    return new Concept(term, createdAt, activationLevel);
  }

  setActivationLevel(newLevel) {
    this.activationLevel = Math.max(0.0, Math.min(1.0, newLevel));
  }

  getActivationLevel() {
    return this.activationLevel;
  }

  setAccessedAt(time) {
    this.accessedAt = time;
  }

  getAccessedAt() {
    return this.accessedAt;
  }

  addTrigger(term) {
    this.triggers.add(term);
  }

  addDerivation(term) {
    this.derivations.add(term);
  }

  addTruth(time, truth) {
    this.truths.set(time, truth);
  }

  getMostRecentTruth() {
    if (this.truths.size === 0) return null;
    
    let latestTime = -Infinity;
    let latestTruth = null;
    
    for (const [time, truth] of this.truths) {
      if (time > latestTime) {
        latestTime = time;
        latestTruth = truth;
      }
    }
    
    return latestTruth;
  }

  addResource(key, value) {
    this.resources.set(key, value);
  }

  getResource(key) {
    return this.resources.get(key);
  }

  toString() {
    return `[Concept: ${this.term.toString()}, activation=${this.activationLevel.toFixed(2)}, accessed=${this.accessedAt}]`;
  }

  equals(other) {
    return other instanceof Concept && this.term.equals(other.term);
  }
}