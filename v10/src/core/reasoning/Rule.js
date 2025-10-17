export class Rule {
    constructor(id, type, priority = 1.0, config = {}) {
        if (!id || typeof id !== 'string') {
            throw new Error('Rule ID must be a non-empty string');
        }

        this._id = id;
        this._type = type;
        this._priority = Math.max(0, Math.min(1, priority));
        this._config = Object.freeze({ ...config });
        this._enabled = config.enabled !== false;
        this._metrics = Object.freeze({
            applications: 0, successes: 0, failures: 0, totalTime: 0, createdAt: Date.now()
        });

        // Freeze after subclasses have added their properties
        Object.freeze(this);
    }

    get id() { return this._id; }
    get type() { return this._type; }
    get priority() { return this._priority; }
    get enabled() { return this._enabled; }
    get config() { return this._config; }
    get metrics() { return this._metrics; }

    // Immutable state modifiers
    enable() { return this._enabled ? this : this._clone({ enabled: true }); }
    disable() { return !this._enabled ? this : this._clone({ enabled: false }); }
    withPriority(priority) {
        const clamped = Math.max(0, Math.min(1, priority));
        return clamped === this._priority ? this : this._clone({ priority: clamped });
    }
    withConfig(config) {
        const merged = { ...this._config, ...config };
        return this._config === merged ? this : this._clone({ config: merged });
    }

    canApply(task) {
        return this._enabled && this._matches(task);
    }

    apply(task) {
        if (!this.canApply(task)) return [];

        const start = performance.now();
        try {
            const results = this._apply(task);
            return { results, rule: this._updateMetrics(true, performance.now() - start) };
        } catch (error) {
            throw { error, rule: this._updateMetrics(false, performance.now() - start) };
        }
    }

    // Template methods
    _matches(task) { return true; }
    _apply(task) { return []; }

    // Internal utilities
    _clone(overrides = {}) {
        return new (this.constructor)(this._id, this._type, this._priority, {
            ...this._config, ...overrides
        });
    }

    _updateMetrics(success, time) {
        return this._clone({
            metrics: {
                applications: this._metrics.applications + 1,
                successes: this._metrics.successes + (success ? 1 : 0),
                failures: this._metrics.failures + (success ? 0 : 1),
                totalTime: this._metrics.totalTime + time,
                createdAt: this._metrics.createdAt
            }
        });
    }
}