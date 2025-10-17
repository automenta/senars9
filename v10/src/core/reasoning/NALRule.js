import {Rule} from './Rule.js';
import {TruthFunctions} from '../term/operations.js';
import {Term} from '../term/Term.js';

export class NALRule extends Rule {
    constructor(id, premises, conclusion, truthFunction, priority = 1.0, config = {}) {
        super(id, 'nal', priority, config);
        this._premises = Object.freeze(premises);
        this._conclusion = conclusion;
        this._truthFunction = truthFunction;
        Object.freeze(this);
    }

    get premises() { return this._premises; }
    get conclusion() { return this._conclusion; }
    get truthFunction() { return this._truthFunction; }

    _matches(task) {
        return this._premises.length > 0 && this._matchesPremises(task);
    }

    _matchesPremises(task) {
        for (const premise of this._premises) {
            if (this._matchesPattern(premise, task.term)) return true;
        }
        return false;
    }

    _matchesPattern(pattern, term) {
        if (pattern.type !== term.type) return false;

        if (pattern.isAtomic && term.isAtomic) {
            return pattern.name === term.name || pattern.name === '?';
        }

        if (pattern.isCompound && term.isCompound) {
            if (pattern.operator !== term.operator) return false;
            if (pattern.components.length !== term.components.length) return false;

            return pattern.components.every((comp, i) =>
                this._matchesPattern(comp, term.components[i])
            );
        }

        return false;
    }

    async _apply(task) {
        const results = [];

        for (const premise of this._premises) {
            if (this._matchesPattern(premise, task.term)) {
                const derivedTasks = await this._deriveFromPremise(premise, task);
                results.push(...derivedTasks);
            }
        }

        return results;
    }

    async _deriveFromPremise(premise, task) {
        const bindings = this._unifyPatterns(premise, task.term);
        if (!bindings) return [];

        const derivedTerm = this._substituteVariables(this._conclusion, bindings);
        const derivedTruth = this._computeDerivedTruth(task.truth, bindings);

        if (!derivedTerm || !derivedTruth) return [];

        return [{
            term: derivedTerm,
            truth: derivedTruth,
            type: task.type,
            stamp: task.stamp,
            priority: task.priority * this.priority
        }];
    }

    _unifyPatterns(pattern, term) {
        const bindings = new Map();

        if (pattern.isAtomic && term.isAtomic) {
            if (pattern.name === '?') {
                bindings.set(pattern.name, term);
            } else if (pattern.name !== term.name) {
                return null;
            }
            return bindings;
        }

        if (pattern.isCompound && term.isCompound) {
            if (pattern.components.length !== term.components.length) return null;

            for (let i = 0; i < pattern.components.length; i++) {
                const patternBindings = this._unifyPatterns(pattern.components[i], term.components[i]);
                if (!patternBindings) return null;

                for (const [key, value] of patternBindings) {
                    bindings.set(key, value);
                }
            }
            return bindings;
        }

        return null;
    }

    _substituteVariables(term, bindings) {
        if (term.isAtomic) {
            return bindings.has(term.name) ? bindings.get(term.name) : term;
        }

        if (term.isCompound) {
            const substitutedComponents = term.components.map(comp =>
                this._substituteVariables(comp, bindings)
            );
            return new Term(term.type, term.name, substitutedComponents, term.operator);
        }

        return term;
    }

    _computeDerivedTruth(taskTruth, bindings) {
        if (!this._truthFunction) return taskTruth;

        // For now, return the original truth - more complex truth computation
        // would require analyzing the specific inference pattern
        return this._truthFunction(taskTruth, taskTruth);
    }
}