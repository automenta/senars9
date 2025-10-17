import {Term, TermType} from './Term.js';

const COMMUTATIVE_OPERATORS = new Set(['&', '|', '+', '*']);

export class TermFactory {
    constructor() {
        this._cache = new Map();
    }

    create(termData) {
        if (!termData) {
            throw new Error('TermFactory.create: termData is required');
        }
        
        if (typeof termData === 'string') {
            // If a string is passed, create an atomic term
            const name = termData;
            const id = name;  // For atomic terms, id is the name itself
            const cached = this._cache.get(id);
            if (cached) return cached;
            
            const term = new Term(TermType.ATOM, name, [], null);
            this._cache.set(term.id, term);
            return term;
        }
        
        if (!termData.components && termData.operator === undefined) {
            // Handle case where termData is a simple object with just a name
            if (termData.name) {
                const name = termData.name;
                const id = name;
                const cached = this._cache.get(id);
                if (cached) return cached;
                
                const term = new Term(TermType.ATOM, name, [], null);
                this._cache.set(term.id, term);
                return term;
            } else {
                throw new Error('TermFactory.create: termData must have components or be a string');
            }
        }
        
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
        this._cache.set(name, term);  // Use name for caching as it represents canonical form
        return term;
    }

    normalize({operator, components}) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory.normalize: components must be an array');
        }
        
        // For terms without operator (atomic-like terms), preserve components as they were provided
        if (!operator) {
            return {operator, components: [...components]}; // Return a copy of original components
        }
        
        // For compound terms with operators, convert components to Term objects and normalize
        let normalizedComponents = components.map(comp =>
            (typeof comp === 'string' || comp instanceof Term) ? 
            (typeof comp === 'string' ? this.create(comp) : comp) : 
            this.create(comp)
        );

        if (operator) {
            // Validate operator type
            if (typeof operator !== 'string') {
                throw new Error('TermFactory.normalize: operator must be a string');
            }
            
            // Flatten associative operators
            if (operator === '&' || operator === '|') {
                normalizedComponents = this.flatten(operator, normalizedComponents);
            }

            // Only sort commutative operators
            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents.sort((a, b) => a.name.localeCompare(b.name));
            }

            // Remove redundancy for commutative operators
            if (COMMUTATIVE_OPERATORS.has(operator)) {
                normalizedComponents = this.removeRedundancy(normalizedComponents);
            }
        }

        return {operator, components: normalizedComponents};
    }

    flatten(operator, components) {
        if (!Array.isArray(components)) {
            throw new Error('TermFactory.flatten: components must be an array');
        }
        
        return components.flatMap(comp =>
            comp?.operator === operator ? comp.components : [comp]
        );
    }

    removeRedundancy(components) {
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
