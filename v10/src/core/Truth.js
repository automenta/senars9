/**
 * Represents the truth value of a statement, consisting of frequency and confidence.
 * This class is strictly immutable.
 */
export class Truth {
  /**
   * @param {number} f - The frequency of the statement being true (0 to 1).
   * @param {number} c - The confidence in the frequency value (0 to 1).
   */
  constructor(f, c) {
    this._f = f;
    this._c = c;
    Object.freeze(this);
  }

  get f() {
    return this._f;
  }

  get c() {
    return this._c;
  }

  equals(other) {
    return other instanceof Truth && this.f === other.f && this.c === other.c;
  }
}