import {Stamp} from '../Stamp.js';
import {Term} from '../term/Term.js';

export class Task {
    constructor({
                    term,
                    type,
                    truth = null,
                    stamp = null,
                    priority = Task.DEFAULTS.priority,
                    budget = Task.DEFAULTS.budget,
                    accessedAt = null
                }) {
        if (!(term instanceof Term)) {
            throw new Error(`Task must be initialized with a valid Term object. Received: ${typeof term}.`);
        }

        this._term = term;
        this._type = type;
        this._truth = truth;
        this._stamp = stamp || Stamp.createInput();
        this._priority = Math.max(Task.DEFAULTS.minPriority, Math.min(Task.DEFAULTS.maxPriority, priority));
        this._budget = budget;
        this._createdAt = this._stamp.occurrenceTime;
        this._accessedAt = accessedAt || this._createdAt;
        Object.freeze(this);
    }

    static get DEFAULTS() {
        return {
            priority: 0.5,
            budget: 1.0,
            minPriority: 0,
            maxPriority: 1
        };
    }

    // Getters
    get term() {
        return this._term;
    }

    get type() {
        return this._type;
    }

    get truth() {
        return this._truth;
    }

    get stamp() {
        return this._stamp;
    }

    get priority() {
        return this._priority;
    }

    get budget() {
        return this._budget;
    }

    get createdAt() {
        return this._createdAt;
    }

    get accessedAt() {
        return this._accessedAt;
    }

    get truthValue() {
        return this._truth;
    }

    get creationTime() {
        return this._createdAt;
    }

    // Immutable operations
    withTruth(newTruth) {
        return new Task({...this._getAllProperties(), truth: newTruth});
    }

    withPriority(newPriority) {
        return new Task({...this._getAllProperties(), priority: newPriority});
    }

    withAccessedAt(newAccessedAt) {
        return new Task({...this._getAllProperties(), accessedAt: newAccessedAt});
    }

    // Type checking
    isBelief() {
        return this.type === 'BELIEF';
    }

    isGoal() {
        return this.type === 'GOAL';
    }

    isQuestion() {
        return this.type === 'QUESTION';
    }

    // Equality
    equals(other) {
        if (!(other instanceof Task)) return false;
        const truthEqual = (!this.truth && !other.truth) || (this.truth?.equals(other.truth));
        return this.term.equals(other.term) && this.type === other.type && truthEqual;
    }

    // Internal method
    _getAllProperties() {
        return {
            term: this.term,
            type: this.type,
            truth: this.truth,
            stamp: this.stamp,
            priority: this.priority,
            budget: this.budget,
            accessedAt: this.accessedAt
        };
    }

    // String representation
    toString() {
        const termStr = this.term.toString();
        const typeStr = this.type === 'BELIEF' ? '.' : this.type === 'GOAL' ? '!' : '?';
        return this.truth ? `${termStr}${typeStr} ${this.truth.f.toFixed(2)};${this.truth.c.toFixed(2)}` : `${termStr}${typeStr}`;
    }
}