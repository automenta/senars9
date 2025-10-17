/**
 * Stamp class - tracks the origin and derivation history of tasks.
 * Implements strict immutability as specified in DESIGN.md.
 */
export class Stamp {
  /**
   * @private
   */
  constructor(id, creationTime, occurrenceTime, fromConcept = null, source = 'INPUT', derivations = []) {
    this._id = id;
    this._creationTime = creationTime;
    this._occurrenceTime = occurrenceTime;
    this._fromConcept = fromConcept;
    this._source = source;
    this._derivations = Object.freeze([...derivations]);
    Object.freeze(this);
  }

  // --- Factory Methods ---

  static createInput(creationTime = Date.now(), occurrenceTime = Date.now()) {
    const id = Stamp.generateId(creationTime);
    return new Stamp(id, creationTime, occurrenceTime, null, 'INPUT', []);
  }

  static createDerived(parentStamps = [], fromConcept = null) {
    const creationTime = Date.now();
    const occurrenceTime = creationTime; // Or some other logic
    const id = Stamp.generateId(creationTime, parentStamps.map(s => s.id));
    const derivations = parentStamps.map(s => s.id);
    return new Stamp(id, creationTime, occurrenceTime, fromConcept, 'DERIVED', derivations);
  }

  // --- Getters ---

  get id() {
    return this._id;
  }

  get creationTime() {
    return this._creationTime;
  }

  get occurrenceTime() {
    return this._occurrenceTime;
  }

  get fromConcept() {
    return this._fromConcept;
  }

  get source() {
    return this._source;
  }

  get derivations() {
    return this._derivations;
  }

  // --- Core Methods ---

  equals(other) {
    return other instanceof Stamp && this.id === other.id;
  }

  // --- Static Helpers ---

  static generateId(timestamp, parentIds = []) {
    // A simple ID generator for demonstration purposes. A real implementation might use UUIDs or hashes.
    const randomPart = Math.random().toString(36).substring(2, 9);
    const parentPart = parentIds.join('-').substring(0, 10);
    return `${timestamp}-${parentPart}-${randomPart}`;
  }
}