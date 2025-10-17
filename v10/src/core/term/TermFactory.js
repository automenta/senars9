import { Term, TermType } from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*']);

export class TermFactory {
 constructor() {
   this._cache = new Map();
 }

 create(termData) {
   const { operator, components } = this.normalize(termData);
   const name = this.buildCanonicalName(operator, components);
   const cached = this._cache.get(name);
   if (cached) return cached;

   const term = new Term(
     operator ? TermType.COMPOUND : TermType.ATOM, name, components, operator
   );
   this._cache.set(name, term);
   return term;
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
   return components.flatMap(comp => comp.operator === operator ? comp.components : [comp]);
 }

 removeRedundancy(components) {
   const seen = new Set();
   return components.filter(comp => seen.has(comp.name) ? false : seen.add(comp.name));
 }

 buildCanonicalName(operator, components) {
   return operator ? `(${operator}, ${components.map(c => c.name).join(', ')})` : components[0].toString();
 }
}