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
    return `%${this.frequency};${this.confidence}%`;
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
    const stamp = Stamp.createInput();
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, stamp);
  }

  static createDerived(parentTasks, term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    if (!Array.isArray(parentTasks) || parentTasks.length === 0) {
      return Task.createInput(term, punctuation, truth, createdAt, occurrenceTime, priority);
    }

    // Merge stamps from parent tasks
    let mergedStamp;
    if (parentTasks.length === 1) {
      mergedStamp = parentTasks[0].stamp.clone();
    } else {
      mergedStamp = Stamp.zip(parentTasks[0], parentTasks[1]);
      for (let i = 2; i < parentTasks.length; i++) {
        mergedStamp = Stamp.zip(mergedStamp.stampArray, parentTasks[i].stamp.stampArray, createdAt);
      }
    }

    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority, mergedStamp);
  }

  getPriority() {
    return this._priority;
  }

  setPriority(newPriority) {
    this._priority = Math.max(0.0, Math.min(1.0, newPriority));
  }

  getAccessedAt() {
    return this._accessedAt;
  }

  setAccessedAt(newTime) {
    this._accessedAt = newTime;
  }

  isBelief() { return this.punctuation === Punctuation.BELIEF; }
  isGoal() { return this.punctuation === Punctuation.GOAL; }
  isQuestion() { return this.punctuation === Punctuation.QUESTION; }

  isExpired(currentTime) {
    return this.expirationTime !== null && currentTime > this.expirationTime;
  }

  setExpirationTime(expirationTime) {
    this.expirationTime = expirationTime;
  }

  setDerivationPath(path) {
    this.derivationPath = [...path];
  }

  toString() {
    const termStr = this.term.toString();
    const puncStr = this.punctuation;
    return this.truth ? `${termStr}${puncStr} ${this.truth}` : `${termStr}${puncStr}`;
  }

  withPriority(newPriority) {
    const newTask = Object.create(Object.getPrototypeOf(this));
    Object.defineProperty(newTask, 'term', { value: this.term, writable: false });
    Object.defineProperty(newTask, 'punctuation', { value: this.punctuation, writable: false });
    Object.defineProperty(newTask, 'truth', { value: this.truth, writable: false });
    Object.defineProperty(newTask, 'createdAt', { value: this.createdAt, writable: false });
    Object.defineProperty(newTask, 'occurrenceTime', { value: this.occurrenceTime, writable: false });
    Object.defineProperty(newTask, 'stamp', { value: this.stamp, writable: false });
    Object.defineProperty(newTask, 'expirationTime', { value: this.expirationTime, writable: true });
    Object.defineProperty(newTask, 'derivationPath', { value: this.derivationPath, writable: true });

    newTask._priority = Math.max(0.0, Math.min(1.0, newPriority));
    newTask._accessedAt = this._accessedAt;

    return newTask;
  }

  // Stamp-related methods
  getStamp() {
    return this.stamp;
  }

  getEvidence() {
    return this.stamp.stampArray;
  }

  hasOverlap(otherTask) {
    return Stamp.overlap(this, otherTask);
  }

  getOriginality() {
    return this.stamp.originality();
  }

  // Task equality and hashing methods
  equals(otherTask) {
    return TaskHash.tasksEqual(this, otherTask);
  }

  hashCode() {
    return TaskHash.hashTask(this);
  }

  // Check if this task is a duplicate of any in the array
  isDuplicateOf(tasks) {
    return TaskHash.isDuplicate(this, tasks);
  }

  // Create a copy with updated stamp (for derivations)
  withStamp(newStamp) {
    const newTask = Object.create(Object.getPrototypeOf(this));
    Object.defineProperty(newTask, 'term', { value: this.term, writable: false });
    Object.defineProperty(newTask, 'punctuation', { value: this.punctuation, writable: false });
    Object.defineProperty(newTask, 'truth', { value: this.truth, writable: false });
    Object.defineProperty(newTask, 'createdAt', { value: this.createdAt, writable: false });
    Object.defineProperty(newTask, 'occurrenceTime', { value: this.occurrenceTime, writable: false });
    Object.defineProperty(newTask, 'stamp', { value: newStamp, writable: false });
    Object.defineProperty(newTask, 'expirationTime', { value: this.expirationTime, writable: true });
    Object.defineProperty(newTask, 'derivationPath', { value: this.derivationPath, writable: true });

    newTask._priority = this._priority;
    newTask._accessedAt = this._accessedAt;

    return newTask;
  }
}