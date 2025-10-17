/**
 * Centralized metrics utility for consistent metric tracking across components
 */
export class Metrics {
    static create() {
        return {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0,
            avgTime: 0,
            lastRun: null,
            lastError: null,
            createdAt: Date.now()
        };
    }

    static update(metrics, success, time, error = null) {
        const updated = {
            executions: metrics.executions + 1,
            successes: metrics.successes + (success ? 1 : 0),
            failures: metrics.failures + (success ? 0 : 1),
            totalTime: metrics.totalTime + time,
            avgTime: 0, // Will be calculated below
            lastRun: Date.now(),
            lastError: error,
            createdAt: metrics.createdAt
        };

        // Calculate average time
        updated.avgTime = updated.executions > 0 ? updated.totalTime / updated.executions : 0;

        return updated;
    }

    static getStats(metrics) {
        return {
            executions: metrics.executions,
            successes: metrics.successes,
            failures: metrics.failures,
            successRate: metrics.executions > 0 ? (metrics.successes / metrics.executions) * 100 : 0,
            avgTime: Math.round(metrics.avgTime * 100) / 100,
            totalTime: Math.round(metrics.totalTime * 100) / 100,
            lastRun: metrics.lastRun,
            lastError: metrics.lastError,
            uptime: Date.now() - metrics.createdAt
        };
    }

    static merge(...metricSets) {
        const merged = this.create();
        for (const metrics of metricSets) {
            merged.executions += metrics.executions;
            merged.successes += metrics.successes;
            merged.failures += metrics.failures;
            merged.totalTime += metrics.totalTime;
            merged.lastRun = Math.max(merged.lastRun || 0, metrics.lastRun || 0);
            if (metrics.lastError) merged.lastError = metrics.lastError;
        }
        merged.avgTime = merged.executions > 0 ? merged.totalTime / merged.executions : 0;
        return merged;
    }
}