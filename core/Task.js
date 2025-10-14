import { Term } from './Term.js';
import { Stamp, TaskHash } from './Stamp.js';

export const Punctuation = {
  BELIEF: '.',
  GOAL: '!',
  QUESTION: '?'
};

export class TruthValue {
  constructor(frequency, confidence) {
    this.frequency = frequency;
    this.confidence = confidence;
  }

  toString() {
    return `%${this.frequency.toFixed(2)};${this.confidence.toFixed(2)}%`;
  }

  static deduction(t1, t2) {
    const f = t1.frequency * t2.frequency;
    const c = t1.frequency * t2.frequency * t1.confidence * t2.confidence;
    return new TruthValue(f, c);
  }

  static induction(t1, t2) {
    const f = t1.frequency;
    const c = TruthValue.#weak(t1.confidence * t2.confidence) * t2.frequency;
    return new TruthValue(f, c);
  }

  static abduction(t1, t2) {
    const f = t2.frequency;
    const c = TruthValue.#weak(t1.confidence * t2.confidence) * t1.frequency;
    return new TruthValue(f, c);
  }

  static detachment(t1, t2) {
    const f = t2.frequency;
    const c = (t1.confidence * t2.confidence) * t1.frequency;
    return new TruthValue(f, c);
  }

  static #weak(c) {
    return c / (c + 1.0);
  }
}

export class Task {
  constructor(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5, stamp = null) {
    this.term = term;
    this.punctuation = punctuation;
    this.truth = truth;
    this._priority = priority;
    this._accessedAt = createdAt;
    this.createdAt = createdAt;
    this.occurrenceTime = occurrenceTime;
    this.expirationTime = null;
    this.derivationPath = null;

    // Initialize stamp for evidence tracking
    this.stamp = stamp || Stamp.createInput();

    // Make key properties immutable
    const immutableProps = ['term', 'punctuation', 'truth', 'createdAt', 'occurrenceTime', 'expirationTime', 'derivationPath', 'stamp'];
    for (const prop of immutableProps) {
      Object.defineProperty(this, prop, { writable: false });
    }
  }

  static create(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5, stamp = null) {
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, stamp);
  }

  static createInput(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, Stamp.createInput());
  }

  static createDerived(parentTasks, term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    if (!Array.isArray(parentTasks) || parentTasks.length === 0) {
      return Task.createInput(term, punctuation, truth, createdAt, occurrenceTime, priority);
    }

    // Merge stamps from parent tasks
    const mergedStamp = Task._mergeStamps(parentTasks, createdAt);
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, mergedStamp);
  }

  static _mergeStamps(parentTasks, createdAt) {
    if (parentTasks.length === 1) {
      return parentTasks[0].stamp.clone();
    }

    let mergedStamp = Stamp.zip(parentTasks[0], parentTasks[1]);
    for (let i = 2; i < parentTasks.length; i++) {
      mergedStamp = Stamp.zip(mergedStamp, parentTasks[i].stamp, createdAt);
    }
    
    return mergedStamp;
  }

  getPriority() { return this._priority; }
  setPriority(newPriority) { this._priority = Math.max(0.0, Math.min(1.0, newPriority)); }
  getAccessedAt() { return this._accessedAt; }
  setAccessedAt(newTime) { this._accessedAt = newTime; }

  isBelief() { return this.punctuation === Punctuation.BELIEF; }
  isGoal() { return this.punctuation === Punctuation.GOAL; }
  isQuestion() { return this.punctuation === Punctuation.QUESTION; }

  isExpired(currentTime) {
    return this.expirationTime !== null && currentTime > this.expirationTime;
  }

  setExpirationTime(expirationTime) { this.expirationTime = expirationTime; }
  setDerivationPath(path) { this.derivationPath = [...path]; }

  toString() {
    const termStr = this.term.toString();
    const puncStr = this.punctuation;
    return this.truth ? `${termStr}${puncStr} ${this.truth.toString()}` : `${termStr}${puncStr}`;
  }

  _createTaskWithProps(props) {
    const newTask = Object.create(Object.getPrototypeOf(this));
    // Copy immutable properties
    ['term', 'punctuation', 'truth', 'createdAt', 'occurrenceTime', 'stamp']
      .forEach(prop => Object.defineProperty(newTask, prop, { value: this[prop], writable: false }));
    
    // Copy mutable properties
    ['expirationTime', 'derivationPath']
      .forEach(prop => Object.defineProperty(newTask, prop, { value: this[prop], writable: true }));

    // Copy internal properties
    newTask._priority = props.priority !== undefined ? props.priority : this._priority;
    newTask._accessedAt = props.accessedAt !== undefined ? props.accessedAt : this._accessedAt;

    return newTask;
  }

  withPriority(newPriority) {
    return this._createTaskWithProps({ priority: Math.max(0.0, Math.min(1.0, newPriority)) });
  }

  // Stamp-related methods
  getStamp() { return this.stamp; }
  getEvidence() { return this.stamp.stampArray; }
  hasOverlap(otherTask) { return Stamp.overlap(this, otherTask); }
  getOriginality() { return this.stamp.originality(); }

  // Task equality and hashing methods
  equals(otherTask) { return TaskHash.tasksEqual(this, otherTask); }
  hashCode() { return TaskHash.hashTask(this); }
  isDuplicateOf(tasks) { return TaskHash.isDuplicate(this, tasks); }

  // Create a copy with updated stamp (for derivations)
  withStamp(newStamp) {
    const newTask = Object.create(Object.getPrototypeOf(this));
    // Copy immutable properties
    ['term', 'punctuation', 'truth', 'createdAt', 'occurrenceTime', 'derivationPath']
      .forEach(prop => Object.defineProperty(newTask, prop, { value: this[prop], writable: false }));
    
    // Set new stamp as immutable
    Object.defineProperty(newTask, 'stamp', { value: newStamp, writable: false });
    
    // Copy mutable properties
    ['expirationTime']
      .forEach(prop => Object.defineProperty(newTask, prop, { value: this[prop], writable: true }));

    // Copy internal properties
    newTask._priority = this._priority;
    newTask._accessedAt = this._accessedAt;

    return newTask;
  }
}