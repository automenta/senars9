import {Stamp} from '../Stamp.js';
import {Term} from '../term/Term.js';
import {clamp} from '../../util/common.js';

export class Task {
    constructor(arg1, punctuationOrType, truth, priority) {
        // Support both old object-based constructor and new convenience constructor
        if (this._isTaskDataObject(arg1)) {
            // Old constructor: ({term, type, truth, stamp, priority, budget, accessedAt})
            const {term, type, truth: truthVal, stamp, priority: prio, budget, accessedAt} = arg1;
            this._initializeFromObject({term, type, truth: truthVal, stamp, priority: prio, budget, accessedAt});
        } else {
            // New convenience constructor: (term, punctuation, truth, priority)
            const term = arg1;
            
            // Second parameter should be punctuation - validate it as such
            if (typeof punctuationOrType !== 'string') {
                throw new Error(`Punctuation must be a string. Received: ${typeof punctuationOrType}.`);
            }
            
            // Treat second parameter as punctuation and convert to type
            const type = Task._getTaskTypeFromPunctuation(punctuationOrType);
            
            this._initializeFromParameters(term, type, truth, priority);
        }
        
        Object.freeze(this);
    }

    _isTaskDataObject(obj) {
        return typeof obj === 'object' && obj !== null && obj.hasOwnProperty('term');
    }

    _initializeFromObject({term, type, truth, stamp, priority, budget, accessedAt}) {
        if (!(term instanceof Term)) {
            throw new Error(`Task must be initialized with a valid Term object. Received: ${typeof term}.`);
        }

        this._term = term;
        this._type = type;
        this._truth = truth ?? null;
        this._stamp = stamp || Stamp.createInput();
        this._priority = clamp(priority ?? Task.DEFAULTS.priority, Task.DEFAULTS.minPriority, Task.DEFAULTS.maxPriority);
        this._budget = budget ?? Task.DEFAULTS.budget;
        this._createdAt = this._stamp.occurrenceTime;
        this._accessedAt = accessedAt || this._createdAt;
    }

    _initializeFromParameters(term, type, truth, priority) {
        if (!(term instanceof Term)) {
            throw new Error(`Task must be initialized with a valid Term object. Received: ${typeof term}.`);
        }
        
        this._term = term;
        this._type = type;
        this._truth = truth ?? null;
        this._stamp = Stamp.createInput();
        this._priority = clamp(priority ?? Task.DEFAULTS.priority, Task.DEFAULTS.minPriority, Task.DEFAULTS.maxPriority);
        this._budget = Task.DEFAULTS.budget;
        this._createdAt = this._stamp.occurrenceTime;
        this._accessedAt = this._createdAt;
    }

    static _getTaskTypeFromPunctuation(punctuation) {
        if (typeof punctuation !== 'string') {
            throw new Error(`Punctuation must be a string. Received: ${typeof punctuation}.`);
        }
        const typeMap = {'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'};
        const type = typeMap[punctuation];
        if (!type) {
            throw new Error(`Invalid punctuation: ${punctuation}. Must be one of '.', '!', '?'`);
        }
        return type;
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
    get term() { return this._term; }
    get type() { return this._type; }
    get truth() { return this._truth; }
    get stamp() { return this._stamp; }
    get priority() { return this._priority; }
    get budget() { return this._budget; }
    get createdAt() { return this._createdAt; }
    get accessedAt() { return this._accessedAt; }
    get truthValue() { return this._truth; }
    get creationTime() { return this._createdAt; }

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