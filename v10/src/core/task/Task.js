/**
 * Task class - represents units of work or information processed by the system
 * Implements strict immutability as specified in DESIGN.md
 */
import { Stamp } from './Stamp.js';

export class Task {
  constructor({ term, truth, type, priority = 0.5, budget = 1.0, stamp = null }) {
    this._term = term;
    this._truth = truth;
    this._type = type;
    this._priority = priority;
    this._budget = budget;
    this._stamp = stamp || Stamp.createInput();
    this._createdAt = Date.now();
    this._accessedAt = Date.now();

    // Freeze the entire object to ensure strict immutability
    Object.freeze(this);
  }
  
  // Getters
  get term() { return this._term; }
  get truth() { return this._truth; }
  get type() { return this._type; }
  get priority() { return this._priority; }
  get budget() { return this._budget; }
  get stamp() { return this._stamp; }
  get createdAt() { return this._createdAt; }
  get accessedAt() { return this._accessedAt; }
  
  // Immutable operations that return new Task instances
  withPriority(newPriority) {
    return new Task({
      term: this._term,
      truth: this._truth,
      type: this._type,
      priority: Math.max(0.0, Math.min(1.0, newPriority)),
      budget: this._budget
    });
  }
  
  withTruth(newTruth) {
    return new Task({
      term: this._term,
      truth: newTruth,
      type: this._type,
      priority: this._priority,
      budget: this._budget
    });
  }
  
  setAccessedAt(timestamp) {
    const newTask = new Task({
      term: this._term,
      truth: this._truth,
      type: this._type,
      priority: this._priority,
      budget: this._budget
    });
    // Override accessedAt (this is a simplification)
    newTask._accessedAt = timestamp;
    return newTask;
  }
  
  isBelief() { return this._type === 'BELIEF'; }
  isGoal() { return this._type === 'GOAL'; }
  isQuestion() { return this._type === 'QUESTION'; }
  
  equals(otherTask) {
    if (!(otherTask instanceof Task)) return false;
    // Deep comparison logic would be implemented
    return this._stamp.id === otherTask._stamp.id;
  }
}

// Stamp functionality will be provided by a separate Stamp class