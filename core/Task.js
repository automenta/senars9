import { Term } from './Term.js';

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
  constructor(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    this.term = term;
    this.punctuation = punctuation;
    this.truth = truth;
    this._priority = priority;
    this._accessedAt = createdAt;
    this.createdAt = createdAt;
    this.occurrenceTime = occurrenceTime;
    this.expirationTime = null;
    this.derivationPath = null;

    // Make key properties immutable
    const immutableProps = ['term', 'punctuation', 'truth', 'createdAt', 'occurrenceTime', 'expirationTime', 'derivationPath'];
    for (const prop of immutableProps) {
      Object.defineProperty(this, prop, { writable: false });
    }
  }

  static create(term, punctuation, truth, createdAt, occurrenceTime, priority = 0.5) {
    return new Task(term, punctuation, truth, createdAt, occurrenceTime, priority);
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
    const newTask = new Task(
      this.term,
      this.punctuation,
      this.truth,
      this.createdAt,
      this.occurrenceTime,
      newPriority
    );
    newTask.setAccessedAt(this._accessedAt);
    newTask.expirationTime = this.expirationTime;
    newTask.derivationPath = this.derivationPath;
    return newTask;
  }
}