/**
 * Stamp class - Tracks the origin and derivation history of tasks
 * Implements evidence handling as specified in DESIGN.md
 */

export class Stamp {
  constructor({ id, occurrenceTime, source, derivations = [], evidentialBase = [] }) {
    this._id = id;
    this._occurrenceTime = occurrenceTime;
    this._source = source;
    this._derivations = [...derivations]; // Array of parent stamp IDs
    this._evidentialBase = [...evidentialBase]; // Array of term IDs

    // Freeze for immutability
    Object.freeze(this._derivations);
    Object.freeze(this._evidentialBase);
    Object.freeze(this);
  }

  // Getters
  get id() { return this._id; }
  get occurrenceTime() { return this._occurrenceTime; }
  get source() { return this._source; }
  get derivations() { return this._derivations; }
  get evidentialBase() { return this._evidentialBase; }

  /**
   * Create a new stamp for input tasks
   * @param {string} source - Source of the input (default: 'INPUT')
   * @returns {Stamp} - New input stamp
   */
  static createInput(source = 'INPUT') {
    return new Stamp({
      id: this._generateId(),
      occurrenceTime: Date.now(),
      source,
      derivations: [],
      evidentialBase: []
    });
  }

  /**
   * Create a new stamp derived from parent stamps
   * @param {Array<Stamp>} parentStamps - Parent stamps
   * @param {string} newSource - Source of the derivation
   * @returns {Stamp} - New derived stamp
   */
  static createDerived(parentStamps, newSource = 'INFERENCE') {
    const parentIds = parentStamps.map(stamp => stamp.id);
    const mergedDerivations = this._mergeDerivations(parentStamps);
    const mergedEvidentialBase = this._mergeEvidentialBase(parentStamps);

    return new Stamp({
      id: this._generateId(),
      occurrenceTime: Date.now(),
      source: newSource,
      derivations: parentIds,
      evidentialBase: mergedEvidentialBase
    });
  }

  /**
   * Check if this stamp is derived from another stamp
   * @param {Stamp} otherStamp - Other stamp to check
   * @returns {boolean} - True if this stamp is derived from the other
   */
  isDerivedFrom(otherStamp) {
    return this._derivations.includes(otherStamp.id) ||
           this._derivations.some(id => otherStamp._derivations.includes(id));
  }

  /**
   * Get the derivation depth (how many inference steps from input)
   * @returns {number} - Derivation depth
   */
  getDerivationDepth() {
    if (this._derivations.length === 0) return 0;

    // This is a simplified calculation - in practice would need to traverse the DAG
    return 1 + Math.max(0, ...this._derivations.map(() => 1));
  }

  /**
   * Check if two stamps have overlapping evidence
   * @param {Stamp} otherStamp - Other stamp to check
   * @returns {boolean} - True if evidence overlaps
   */
  hasOverlappingEvidence(otherStamp) {
    return this._evidentialBase.some(id => otherStamp._evidentialBase.includes(id));
  }

  /**
   * Create a copy of this stamp with updated properties
   * @param {Object} updates - Properties to update
   * @returns {Stamp} - New stamp with updated properties
   */
  withUpdates(updates) {
    return new Stamp({
      id: updates.id || this._id,
      occurrenceTime: updates.occurrenceTime || this._occurrenceTime,
      source: updates.source || this._source,
      derivations: updates.derivations || this._derivations,
      evidentialBase: updates.evidentialBase || this._evidentialBase
    });
  }

  /**
   * Convert stamp to JSON for serialization
   * @returns {Object} - JSON representation
   */
  toJSON() {
    return {
      id: this._id,
      occurrenceTime: this._occurrenceTime,
      source: this._source,
      derivations: this._derivations,
      evidentialBase: this._evidentialBase
    };
  }

  /**
   * Create stamp from JSON
   * @param {Object} json - JSON representation
   * @returns {Stamp} - New stamp
   */
  static fromJSON(json) {
    return new Stamp(json);
  }

  // Private helper methods

  static _generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  static _mergeDerivations(parentStamps) {
    const allDerivations = new Set();

    for (const stamp of parentStamps) {
      // Add direct derivations
      for (const derivationId of stamp._derivations) {
        allDerivations.add(derivationId);
      }

      // Add the stamp itself to evidential base
      allDerivations.add(stamp.id);
    }

    return Array.from(allDerivations);
  }

  static _mergeEvidentialBase(parentStamps) {
    const mergedBase = new Set();

    for (const stamp of parentStamps) {
      for (const evidenceId of stamp._evidentialBase) {
        mergedBase.add(evidenceId);
      }
      mergedBase.add(stamp.id);
    }

    return Array.from(mergedBase);
  }
}