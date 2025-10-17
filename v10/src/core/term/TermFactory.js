import {Term, TermType} from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*']);
const ASSOCIATIVE_OPERATORS = new Set(['&', '|']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
    }

    create(termData) {
        if (!termData) {
            throw new Error('TermFactory.create: termData is required');
        }
        
        // Handle string input
        if (typeof termData === 'string') {
            return this._createAtomic(termData);
        }
        
        // Handle simple object with name
        if (!termData.components && termData.operator === undefined && termData.name) {
            return this._createAtomic(termData.name);
        }
        
        // Handle compound terms
        const {operator, components} = this.normalize(termData);
        const name = this.buildCanonicalName(operator, components);
        return this._cache.get(name) || this._createAndCache(operator, components, name);
    }

    _createAtomic(name) {
        const cached = this._cache.get(name);
        if (cached) return cached;
        
        const term = new Term(TermType.ATOM, name, [], null);
        this._cache.set(term.id, term);
        return term;
    }

    _createAndCache(operator, components, name) {
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
        if (!Array.isArray(components)) {
            throw new Error('TermFactory.normalize: components must be an array');
        }
        
        // Normalize components: convert strings to Terms recursively
        let normalizedComponents = components.map(comp =>
            (typeof comp === 'string' || comp instanceof Term) ? 
            (typeof comp === 'string' ? this.create(comp) : comp) : 
            this.create(comp)
        );

        // Process operators if present
        if (operator) {
            this._validateOperator(operator);
            
            // Flatten associative operators
            if (ASSOCIATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._flatten(operator, normalizedComponents);
            }

            // Sort and remove redundancy for commutative operators
            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this._normalizeCommutative(normalizedComponents);
            }
        }

        return {operator, components: normalizedComponents};
    }

    _validateOperator(operator) {
        if (typeof operator !== 'string') {
            throw new Error('TermFactory.normalize: operator must be a string');
        }
    }

    _flatten(operator, components) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory.flatten: components must be an array');
        }
        
        return components.flatMap(comp =>
            comp?.operator === operator ? comp.components : [comp]
        );
    }

    _normalizeCommutative(components) {
        // Sort components by name for commutative operators
        const sorted = components.sort((a, b) => a.name.localeCompare(b.name));
        
        // Remove duplicates
        return this._removeRedundancy(sorted);
    }

    _removeRedundancy(components) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory.removeRedundancy: components must be an array');
        }
        
        const seen = new Set();
        return components.filter(comp => {
            if (!comp || typeof comp.name !== 'string') {
                throw new Error('TermFactory.removeRedundancy: component must have a name property');
            }
            
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
