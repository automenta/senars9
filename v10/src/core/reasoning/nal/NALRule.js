import {Rule} from '../Rule.js';
import {Term} from '../../term/Term.js';
import {TruthFunctions} from './TruthFunctions.js';

/**
 * Enhanced NALRule base class with sophisticated pattern matching and variable handling
 */
export class NALRule extends Rule {
    constructor(id, config = {}) {
        super(id, 'nal', config.priority || 1.0, config);
        this._patternMatcher = config.patternMatcher || new PatternMatcher();
        this._truthFunction = config.truthFunction || TruthFunctions.deduction;
        this._variableBindings = new Map();
    }

    /**
     * Check if the rule can be applied to the given task
     * @param {Object} task - The task to check against
     * @param {Object} context - Additional context for the rule application
     * @returns {boolean} - Whether the rule can be applied
     */
    canApply(task, context = {}) {
        if (!super.canApply(task)) return false;
        return this._matches(task, context);
    }

    /**
     * Apply the rule to the given task
     * @param {Object} task - The task to apply the rule to
     * @param {Object} context - Additional context for the rule application
     * @returns {Array} - Array of derived tasks
     */
    async apply(task, context = {}) {
        if (!this.canApply(task, context)) return {results: [], rule: this};

        const start = performance.now();
        try {
            const results = await this._apply(task, context);
            return {results, rule: this._updateMetrics(true, performance.now() - start)};
        } catch (error) {
            throw {error, rule: this._updateMetrics(false, performance.now() - start)};
        }
    }

    /**
     * Template method to match a task against the rule's pattern
     * @param {Object} task - The task to match
     * @param {Object} context - Additional context
     * @returns {boolean} - Whether the task matches
     */
    _matches(task, context) {
        return true; // Override in subclasses
    }

    /**
     * Template method to apply the rule to a task
     * @param {Object} task - The task to apply the rule to
     * @param {Object} context - Additional context
     * @returns {Array} - Array of derived tasks
     */
    async _apply(task, context) {
        return []; // Override in subclasses
    }

    /**
     * Unify two terms, creating variable bindings
     * @param {Term} pattern - The pattern term
     * @param {Term} term - The actual term
     * @returns {Map|null} - Map of variable bindings or null if unification fails
     */
    _unify(pattern, term) {
        return this._patternMatcher.unify(pattern, term);
    }

    /**
     * Apply variable substitutions to a term
     * @param {Term} term - The term to substitute
     * @param {Map} bindings - The variable bindings
     * @returns {Term} - The substituted term
     */
    _substitute(term, bindings) {
        return this._patternMatcher.substitute(term, bindings);
    }

    /**
     * Calculate the derived truth value using the truth function
     * @param {Object} truth1 - First truth value
     * @param {Object} truth2 - Second truth value
     * @returns {Object} - Derived truth value
     */
    _calculateTruth(truth1, truth2) {
        if (this._truthFunction) {
            return this._truthFunction(truth1, truth2);
        }
        return truth1; // Default: return the first truth value unchanged
    }

    /**
     * Create a derived task based on the original task and new properties
     * @param {Object} originalTask - The original task
     * @param {Object} properties - New properties for the derived task
     * @returns {Object} - The derived task
     */
    _createDerivedTask(originalTask, properties) {
        return {
            term: properties.term || originalTask.term,
            truth: properties.truth || originalTask.truth,
            type: properties.type || originalTask.type,
            stamp: properties.stamp || originalTask.stamp,
            priority: properties.priority || (originalTask.priority * this.priority)
        };
    }
}

/**
 * Pattern matcher class for handling variable bindings and substitutions
 */
class PatternMatcher {
    /**
     * Unify two terms, creating variable bindings
     * @param {Term} pattern - The pattern term
     * @param {Term} term - The actual term
     * @returns {Map|null} - Map of variable bindings or null if unification fails
     */
    unify(pattern, term) {
        const bindings = new Map();

        if (!this._unifyTerms(pattern, term, bindings)) {
            return null; // Unification failed
        }

        return bindings;
    }

    /**
     * Internal method to unify two terms
     * @private
     */
    _unifyTerms(pattern, term, bindings) {
        // Check if pattern is a variable (starts with ?)
        if (this._isVariable(pattern)) {
            const variableName = pattern.name || pattern.toString();
            if (bindings.has(variableName)) {
                // Variable already bound, check consistency
                const boundValue = bindings.get(variableName);
                return this._termsEqual(boundValue, term);
            } else {
                // Bind the variable
                bindings.set(variableName, term);
                return true;
            }
        }

        // Both must be of same type
        if (pattern.type !== term.type) return false;

        // Check atomic terms
        if (pattern.isAtomic) {
            return this._termsEqual(pattern, term);
        }

        // Check compound terms
        if (pattern.isCompound) {
            if (pattern.operator !== term.operator) return false;
            if (pattern.components.length !== term.components.length) return false;

            // Recursively unify components
            for (let i = 0; i < pattern.components.length; i++) {
                if (!this._unifyTerms(pattern.components[i], term.components[i], bindings)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    /**
     * Apply variable substitutions to a term
     * @param {Term} term - The term to substitute
     * @param {Map} bindings - The variable bindings
     * @returns {Term} - The substituted term
     */
    substitute(term, bindings) {
        if (this._isVariable(term)) {
            const variableName = term.name || term.toString();
            return bindings.has(variableName) ? bindings.get(variableName) : term;
        }

        if (term.isCompound) {
            const newComponents = term.components.map(comp => this.substitute(comp, bindings));
            return new Term(term.type, term.name, newComponents, term.operator);
        }

        return term;
    }

    /**
     * Check if a term is a variable
     * @param {Term} term - The term to check
     * @returns {boolean} - Whether the term is a variable
     */
    _isVariable(term) {
        return term.name && typeof term.name === 'string' && term.name.startsWith('?');
    }

    /**
     * Check if two terms are equal
     * @param {Term} t1 - First term
     * @param {Term} t2 - Second term
     * @returns {boolean} - Whether the terms are equal
     */
    _termsEqual(t1, t2) {
        if (!t1 || !t2) return t1 === t2;
        return t1.toString() === t2.toString(); // Simplified for now
    }
}