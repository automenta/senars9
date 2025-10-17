/**
 * Abstract base class for Stamps.
 * A Stamp tracks the origin and derivation history of a Task.
 * This class is strictly immutable.
 */
export class Stamp {
  constructor() {
    if (this.constructor === Stamp) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  // Abstract methods to be implemented by subclasses
  derive(parentStamps) {
    throw new Error("Method 'derive()' must be implemented.");
  }

  equals(other) {
    throw new Error("Method 'equals()' must be implemented.");
  }

  toString() {
    throw new Error("Method 'toString()' must be implemented.");
  }
}

/**
 * An array-based implementation of Stamp.
 */
export class ArrayStamp extends Stamp {
  constructor(id, occurrenceTime, source, derivations = []) {
    super();
    this._id = id;
    this._occurrenceTime = occurrenceTime;
    this._source = source;
    this._derivations = Object.freeze(derivations);
    Object.freeze(this);
  }

  get id() {
    return this._id;
  }

  get occurrenceTime() {
    return this._occurrenceTime;
  }

  get source() {
    return this._source;
  }

  get derivations() {
    return this._derivations;
  }

  static derive(parentStamps) {
    const newId = Math.random().toString(36).substring(2); // Simplified ID generation
    const newTime = Date.now();
    const newDerivations = [...new Set(parentStamps.flatMap(p => [p.id, ...p.derivations]))];
    return new ArrayStamp(newId, newTime, 'INFERENCE', newDerivations);
  }

  equals(other) {
    return other instanceof ArrayStamp && this.id === other.id;
  }

  toString() {
    return `Stamp(id=${this.id}, time=${this.occurrenceTime}, source=${this.source})`;
  }
}

/**
 * A bloom-filter-based implementation of Stamp.
 * This is a placeholder for future development.
 */
export class BloomStamp extends Stamp {
  constructor() {
    super();
    throw new Error("BloomStamp is not yet implemented.");
  }

  // In the future, this would use a bloom filter for efficient derivation tracking.
}