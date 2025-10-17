export class Rule {
    constructor(id, type, priority = 1.0, config = {}) {
        this._id = id;
        this._type = type;
        this._priority = priority;
        this._config = config;
        this._enabled = true;
        this._metrics = {
            applications: 0,
            successes: 0,
            failures: 0,
            totalTime: 0,
            createdAt: Date.now()
        };
        // Don't freeze here - let subclasses add properties first
    }

    get id() { return this._id; }
    get type() { return this._type; }
    get priority() { return this._priority; }
    get enabled() { return this._enabled; }
    get metrics() { return { ...this._metrics }; }

    enable() { return new Rule(this._id, this._type, this._priority, { ...this._config, enabled: true }); }
    disable() { return new Rule(this._id, this._type, this._priority, { ...this._config, enabled: false }); }

    canApply(task) { return this._enabled && this._matches(task); }
    async apply(task) {
        if (!this.canApply(task)) return [];

        const startTime = Date.now();
        try {
            const results = await this._apply(task);
            this._updateMetrics(true, Date.now() - startTime);
            return results;
        } catch (error) {
            this._updateMetrics(false, Date.now() - startTime);
            throw error;
        }
    }

    _matches(task) { return true; }
    async _apply(task) { return []; }
    _updateMetrics(success, time) {
        this._metrics.applications++;
        success ? this._metrics.successes++ : this._metrics.failures++;
        this._metrics.totalTime += time;
    }
}