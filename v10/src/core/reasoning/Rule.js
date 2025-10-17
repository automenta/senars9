import {Metrics} from '../util/Metrics.js';
import {TRUTH} from '../config/constants.js';

export class Rule {
    constructor(id, type, priority = 1.0, config = {}) {
        if (!id || typeof id !== 'string') {
            throw new Error('Rule ID must be a non-empty string');
        }

        this._id = id;
        this._type = type;
        this._priority = Math.max(TRUTH.MIN_PRIORITY, Math.min(TRUTH.MAX_PRIORITY, priority));
        this._config = Object.freeze({...config});
        this._enabled = config.enabled !== false;
        this._metrics = Object.freeze({
            applications: 0, successes: 0, failures: 0, totalTime: 0, createdAt: Date.now()
        });
    }

    get id() {
        return this._id;
    }

    get type() {
        return this._type;
    }

    get priority() {
        return this._priority;
    }

    get enabled() {
        return this._enabled;
    }

    get config() {
        return this._config;
    }

    get metrics() {
        return this._metrics;
    }

    // Immutable state modifiers
    enable() {
        return this._enabled ? Object.freeze({...this}) : this._clone({enabled: true});
    }

    disable() {
        return this._enabled ? this._clone({enabled: false}) : Object.freeze({...this});
    }

    withPriority(priority) {
        const clamped = Math.max(TRUTH.MIN_PRIORITY, Math.min(TRUTH.MAX_PRIORITY, priority));
        return clamped === this._priority ? Object.freeze({...this}) : this._clone({priority: clamped});
    }

    withConfig(config) {
        const merged = {...this._config, ...config};
        return this._config === merged ? Object.freeze({...this}) : this._clone({config: merged});
    }

    canApply(task) {
        return this._enabled && this._matches(task);
    }

    apply(task) {
        if (!this.canApply(task)) return [];

        const start = performance.now();
        try {
            const results = this._apply(task);
            return {results, rule: this._updateMetrics(true, performance.now() - start)};
        } catch (error) {
            throw {error, rule: this._updateMetrics(false, performance.now() - start)};
        }
    }

    // Template methods
    _matches(task) {
        return true;
    }

    _apply(task) {
        return [];
    }

    // Internal utilities
    _clone(overrides = {}) {
        const Constructor = this.constructor;
        const baseArgs = [this._id, this._type, this._priority];
        const configArg = {...this._config, ...overrides};

        // Handle different constructor signatures for subclasses
        const newRule = Constructor.length === 4
            ? new Constructor(...baseArgs, configArg)
            : new Constructor(...baseArgs, this._priority, configArg);
        
        Object.freeze(newRule);
        return newRule;
    }

    _updateMetrics(success, time) {
        const metrics = Metrics.update(this._metrics, success, time);
        const newRule = this._clone({metrics});
        Object.freeze(newRule);
        return newRule;
    }
}