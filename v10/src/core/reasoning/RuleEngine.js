import {Rule} from './Rule.js';
import {RuleSet} from './RuleSet.js';

export class RuleEngine {
    constructor(config = {}) {
        this._config = config;
        this._rules = new Map();
        this._ruleSets = new Map();
        this._metrics = {
            totalApplications: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            totalTime: 0,
            createdAt: Date.now()
        };
    }

    get rules() { return Array.from(this._rules.values()); }
    get ruleSets() { return Array.from(this._ruleSets.values()); }
    get metrics() { return { ...this._metrics }; }

    register(rule) {
        if (!(rule instanceof Rule)) throw new Error('Invalid rule type');
        this._rules.set(rule.id, rule);
        return this;
    }

    unregister(ruleId) {
        this._rules.delete(ruleId);
        return this;
    }

    getRule(ruleId) {
        return this._rules.get(ruleId);
    }

    createSet(name, ruleIds = []) {
        const rules = ruleIds.map(id => this._rules.get(id)).filter(Boolean);
        const ruleSet = new RuleSet(name, rules);
        this._ruleSets.set(name, ruleSet);
        return ruleSet;
    }

    getSet(name) {
        return this._ruleSets.get(name);
    }

    getApplicableRules(task) {
        const applicable = [];
        for (const rule of this._rules.values()) {
            if (rule.canApply(task)) applicable.push(rule);
        }
        return applicable.sort((a, b) => b.priority - a.priority);
    }

    async applyRule(rule, task) {
        if (!rule || !this._rules.has(rule.id)) return [];

        const startTime = Date.now();
        try {
            const results = await rule.apply(task);
            this._updateMetrics(true, Date.now() - startTime);
            return results;
        } catch (error) {
            this._updateMetrics(false, Date.now() - startTime);
            throw error;
        }
    }

    async applyRules(task, ruleIds = null) {
        const rules = ruleIds
            ? ruleIds.map(id => this._rules.get(id)).filter(Boolean)
            : this.getApplicableRules(task);

        const results = [];
        for (const rule of rules) {
            try {
                const ruleResults = await this.applyRule(rule, task);
                if (ruleResults.length > 0) results.push(...ruleResults);
            } catch (error) {
                console.warn(`Rule ${rule.id} failed:`, error);
            }
        }
        return results;
    }

    enableRule(ruleId) {
        const rule = this._rules.get(ruleId);
        if (rule) {
            const enabledRule = rule.enable();
            this._rules.set(ruleId, enabledRule);
        }
        return this;
    }

    disableRule(ruleId) {
        const rule = this._rules.get(ruleId);
        if (rule) {
            const disabledRule = rule.disable();
            this._rules.set(ruleId, disabledRule);
        }
        return this;
    }

    clear() {
        this._rules.clear();
        this._ruleSets.clear();
        return this;
    }

    _updateMetrics(success, time) {
        this._metrics.totalApplications++;
        success ? this._metrics.totalSuccesses++ : this._metrics.totalFailures++;
        this._metrics.totalTime += time;
    }
}