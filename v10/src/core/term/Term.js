import crypto from 'crypto';

export const TermType = {
  ATOM: 'atom',
  COMPOUND: 'compound',
};

/**
 * Represents a knowledge element in the system.
 * This class is strictly immutable. Instances should be created via TermFactory.
 */
export class Term {
  /**
   * @private
   */
  constructor(type, name, components = [], operator = null) {
    this._type = type;
    this._name = name; // The canonical string representation
    this._operator = operator;
    this._components = Object.freeze(components);

    // Pre-calculate and cache complexity and hash
    this._complexity = this._calculateComplexity();
    this._hash = Term.computeHash(this._name);

    Object.freeze(this);
  }

  // --- Getters ---

  get type() {
    return this._type;
  }

  get name() {
    return this._name;
  }

  get operator() {
    return this._operator;
  }

  get components() {
    return this._components;
  }

  get complexity() {
    return this._complexity;
  }

  get hash() {
    return this._hash;
  }

  get isAtomic() {
    return this._type === TermType.ATOM;
  }

  get isCompound() {
    return this._type === TermType.COMPOUND;
  }

  // --- Public Methods ---

  equals(other) {
    if (!(other instanceof Term)) {
      return false;
    }
    // Since name is the canonical representation, a name match is sufficient
    return this.name === other.name;
  }

  toString() {
    return this.name;
  }

  visit(visitorFn, order = 'pre-order') {
    if (order === 'pre-order') visitorFn(this);
    this._components.forEach(comp => comp.visit(visitorFn, order));
    if (order === 'post-order') visitorFn(this);
  }

  reduce(reducerFn, initialValue) {
    let result = reducerFn(initialValue, this);
    for (const comp of this._components) {
      result = comp.reduce(reducerFn, result);
    }
    return result;
  }

  // --- Private & Static Helpers ---

  _calculateComplexity() {
    if (this.type === TermType.ATOM) {
      return 1;
    }
    return 1 + this._components.reduce((sum, comp) => sum + comp.complexity, 0);
  }

  static computeHash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}