import {Logger} from '../../util/Logger.js';
import {Rule} from './Rule.js';
import {RuleSet} from './RuleSet.js';
import {Metrics} from '../util/Metrics.js';

export class RuleEngine {
    constructor(config = {}) {
        this._config = config;
        this._rules = new Map();
        this._ruleSets = new Map();
        this.logger = Logger;
        this._metrics = {
            totalApplications: 0, totalSuccesses: 0, totalFailures: 0, totalTime: 0, createdAt: Date.now()
        };
    }

    get rules() {
        return Array.from(this._rules.values());
    }

    get ruleSets() {
        return Array.from(this._ruleSets.values());
    }

    get metrics() {
        return {...this._metrics};
    }

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
        return this._ruleSets.set(name, new RuleSet(name, rules)).get(name);
    }

    getSet(name) {
        return this._ruleSets.get(name);
    }

    getApplicableRules(task) {
        return Array.from(this._rules.values())
            .filter(rule => rule.canApply(task))
            .sort((a, b) => b.priority - a.priority);
    }

    applyRule(rule, task) {
        if (!rule || !this._rules.has(rule.id)) return {results: [], rule};

        const startTime = Date.now();
        let success = false;

        try {
            const {results, rule: updatedRule} = rule.apply(task);
            this._rules.set(rule.id, updatedRule);
            success = true;
            return {results, rule: updatedRule};
        } catch (error) {
            if (error.rule) this._rules.set(rule.id, error.rule);
            throw error.error || error;
        } finally {
            this._updateMetrics(success, Date.now() - startTime);
        }
    }

    applyRules(task, ruleIds = null) {
        const rules = ruleIds ?
            ruleIds.map(id => this._rules.get(id)).filter(Boolean) :
            this.getApplicableRules(task);

        const allResults = [];
        for (const rule of rules) {
            try {
                const {results} = this.applyRule(rule, task);
                allResults.push(...results);
            } catch (error) {
                this.logger.warn(`Rule ${rule.id} failed:`, error);
            }
        }

        return allResults;
    }

    enableRule(ruleId) {
        const rule = this._rules.get(ruleId);
        if (rule) this._rules.set(ruleId, rule.enable());
        return this;
    }

    disableRule(ruleId) {
        const rule = this._rules.get(ruleId);
        if (rule) this._rules.set(ruleId, rule.disable());
        return this;
    }

    clear() {
        this._rules.clear();
        this._ruleSets.clear();
        return this;
    }

    _updateMetrics(success, time) {
        this._metrics = Metrics.update(this._metrics, success, time);
    }
}