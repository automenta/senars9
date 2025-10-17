import crypto from 'crypto';

export const TermType = {
  ATOM: 'atom',
  COMPOUND: 'compound',
};

export class Term {
  constructor(type, name, components = [], operator = null) {
    this._type = type;
    this._name = name;
    this._operator = operator;
    this._components = Object.freeze(components);
    this._complexity = this._calculateComplexity();
    this._hash = Term.computeHash(this._name);
    Object.freeze(this);
  }

  get type() { return this._type; }
  get name() { return this._name; }
  get operator() { return this._operator; }
  get components() { return this._components; }
  get complexity() { return this._complexity; }
  get hash() { return this._hash; }

  get isAtomic() { return this._type === TermType.ATOM; }
  get isCompound() { return this._type === TermType.COMPOUND; }

  equals(other) {
    return other instanceof Term && this.name === other.name;
  }

  toString() { return this.name; }

  visit(visitorFn, order = 'pre-order') {
    order === 'pre-order' && visitorFn(this);
    this._components.forEach(comp =>
      comp instanceof Term && comp.visit(visitorFn, order)
    );
    order === 'post-order' && visitorFn(this);
  }

  reduce(reducerFn, initialValue) {
    let result = reducerFn(initialValue, this);
    for (const comp of this._components) {
      if (comp instanceof Term) {
        result = comp.reduce(reducerFn, result);
      }
    }
    return result;
  }

  _calculateComplexity() {
    return this.type === TermType.ATOM
      ? 1
      : 1 + this._components.reduce((sum, comp) => sum + comp.complexity, 0);
  }

  static computeHash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}