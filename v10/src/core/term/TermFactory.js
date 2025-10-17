import { Term, TermType } from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*']);

export class TermFactory {
 constructor() {
   this._cache = new Map();
 }

 create(termData) {
   const { operator, components } = this.normalize(termData);
   const name = this.buildCanonicalName(operator, components);
   return this._cache.has(name)
     ? this._cache.get(name)
     : this._cache.set(name, new Term(
         operator ? TermType.COMPOUND : TermType.ATOM,
         name, components, operator
       )) && this._cache.get(name);
 }

  normalize({ operator, components }) {
    let normalizedComponents = components.map(comp =>
      (typeof comp === 'string' || comp instanceof Term) ? comp : this.create(comp)
    );

    if (operator) {
      COMMUTATIVE_OPERATORS.has(operator) &&
        (normalizedComponents.sort((a, b) => a.name.localeCompare(b.name)));

      (operator === '&' || operator === '|') &&
        (normalizedComponents = this.flatten(operator, normalizedComponents));

      COMMUTATIVE_OPERATORS.has(operator) &&
        (normalizedComponents.sort((a, b) => a.name.localeCompare(b.name)));

      normalizedComponents = this.removeRedundancy(normalizedComponents);
    }

    return { operator, components: normalizedComponents };
  }

  flatten(operator, components) {
    const flattened = [];
    components.forEach(comp =>
      flattened.push(...(comp.operator === operator ? comp.components : [comp]))
    );
    return flattened;
  }

  removeRedundancy(components) {
    const seen = new Set();
    return components.filter(comp =>
      seen.has(comp.name) ? false : (seen.add(comp.name), true)
    );
  }

  buildCanonicalName(operator, components) {
    return operator
      ? `(${operator}, ${components.map(c => c.name).join(', ')})`
      : components[0].toString();
  }
}