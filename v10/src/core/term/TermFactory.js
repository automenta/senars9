import {Term, TermType} from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
    }

    create(termData) {
        const {operator, components} = this.normalize(termData);
        const name = this.buildCanonicalName(operator, components);
        const cached = this._cache.get(name);
        if (cached) return cached;

        const term = new Term(
            operator ? TermType.COMPOUND : TermType.ATOM,
            name,
            components,
            operator
        );
        this._cache.set(name, term);
        return term;
    }

    normalize({operator, components}) {
        let normalizedComponents = components.map(comp =>
            (typeof comp === 'string' || comp instanceof Term) ? comp : this.create(comp)
        );

        if (operator) {
            // Only sort commutative operators
            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents.sort((a, b) => a.name.localeCompare(b.name));
            }

            // Flatten associative operators
            if (operator === '&' || operator === '|') {
                normalizedComponents = this.flatten(operator, normalizedComponents);
            }

            // Remove redundancy for commutative operators
            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this.removeRedundancy(normalizedComponents);
            }
        }

        return {operator, components: normalizedComponents};
    }

    flatten(operator, components) {
        return components.flatMap(comp =>
            comp.operator === operator ? comp.components : [comp]
        );
    }

    removeRedundancy(components) {
        const seen = new Set();
        return components.filter(comp => {
            if (seen.has(comp.name)) return false;
            seen.add(comp.name);
            return true;
        });
    }

    buildCanonicalName(operator, components) {
        if (!operator) {
            return components[0].toString();
        }

        const componentNames = components.map(c => c.name);

        const namePatterns = {
            '--': `(--, ${componentNames[0]})`,
            '&': `(&, ${componentNames.join(', ')})`,
            '|': `(|, ${componentNames.join(', ')})`,
            '&/': `(&/, ${componentNames.slice(0, 2).join(', ')})`,
            '-->': `(-->, ${componentNames[0]}, ${componentNames[1]})`,
            '<->': `(<->, ${componentNames[0]}, ${componentNames[1]})`,
            '==>': `(==>, ${componentNames[0]}, ${componentNames[1]})`,
            '<=>': `(<=>, ${componentNames[0]}, ${componentNames[1]})`,
            '^': `(^, ${componentNames[0]}, ${componentNames[1]})`,
            '{{--': `({{--, ${componentNames[0]}, ${componentNames[1]})`,
            '--}}': `(--}}, ${componentNames[0]}, ${componentNames[1]})`,
            '{}': `{${componentNames.join(', ')}}`,
            '[]': `[${componentNames.join(', ')}]`,
            ',': `(${componentNames.join(', ')})`
        };

        return namePatterns[operator] || `(${operator}, ${componentNames.join(', ')})`;
    }
}
