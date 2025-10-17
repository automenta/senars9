import { sha256 } from 'js-sha256';

export const TermType = {
  ATOM: 'atom',
  COMPOUND: 'compound',
};

// As per DESIGN.md, different term types have different string representations
const TermRepresentation = {
  INHERITANCE: '-->',
  SIMILARITY: '<->',
  IMPLICATION: '==>',
  EQUIVALENCE: '<=>',
  CONJUNCTION: '&,',
  DISJUNCTION: '|,',
  NEGATION: '--,',
  PRODUCT: ',',
  // Add other types as needed
};

/**
 * Term class - represents knowledge elements in the system.
 * Implements strict immutability as specified in DESIGN.md.
 * Use static factory methods `Term.newAtom()` and `Term.createCompound()` to create instances.
 */
export class Term {
  /**
   * @private
   */
  constructor(type, name, components = []) {
    this._type = type;
    this._name = name; // The canonical string representation
    this._components = Object.freeze([...components]);

    // Pre-calculate and cache complexity and hash
    this._complexity = this._calculateComplexity();
    this._hash = Term.computeHash(this._name);

    Object.freeze(this);
  }

  // --- Factory Methods ---

  static newAtom(name) {
    return new Term(TermType.ATOM, name);
  }

  static createCompound(operator, components) {
    // Per DESIGN.md, handle normalization for commutative operators
    if (Term.isCommutative(operator)) {
      components.sort((a, b) => a.name.localeCompare(b.name));
    }
    const name = Term.buildCompoundName(operator, components);
    return new Term(TermType.COMPOUND, name, components);
  }

  // --- Getters ---

  get type() {
    return this._type;
  }

  get name() {
    return this._name;
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

  static isCommutative(operator) {
    return [TermRepresentation.CONJUNCTION, TermRepresentation.SIMILARITY, TermRepresentation.EQUIVALENCE, TermRepresentation.DISJUNCTION].includes(operator);
  }

  static buildCompoundName(operator, components) {
    const componentNames = components.map(c => c.name).join(', ');

    // Infix operators
    if (['-->', '<->', '==>', '<=>'].includes(operator)) {
        if (components.length !== 2) throw new Error(`Operator ${operator} requires 2 components.`);
        return `(${components[0].name} ${operator} ${components[1].name})`;
    }

    // Prefix operators
    return `(${operator} ${componentNames})`;
  }

  static computeHash(str) {
    return sha256(str);
  }
}