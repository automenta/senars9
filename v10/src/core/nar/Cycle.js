/**
 * Cycle class - Manages the reasoning cycle execution
 * Orchestrates task selection, rule application, and memory updates
 */

import {Logger} from '../../util/Logger.js';

export class Cycle {
    constructor({memory, focus, ruleEngine, taskManager, config}) {
        this._memory = memory;
        this._focus = focus;
        this._ruleEngine = ruleEngine;
        this._taskManager = taskManager;
        this._config = config;
        this.logger = Logger;

        // Cycle state
        this._cycleCount = 0;
        this._isRunning = false;
        this._lastCycleTime = 0;

        // Statistics
        this._stats = {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            createdAt: Date.now()
        };
    }

    // Getters
    get cycleCount() {
        return this._cycleCount;
    }

    get isRunning() {
        return this._isRunning;
    }

    get stats() {
        return {...this._stats};
    }

    /**
     * Execute a single reasoning cycle
     * @returns {Object} - Cycle results and statistics
     */
    async execute() {
        const cycleStartTime = Date.now();
        this._isRunning = true;

        try {
            // Process any pending tasks first
            const processedTasks = this._taskManager.processPendingTasks(cycleStartTime);

            // Consolidate memory (decay, promotion, forgetting)
            this._memory.consolidate(cycleStartTime);

            // Get tasks for reasoning (from focus memory)
            const focusTasks = this._getTasksForReasoning();

            // Apply rules to generate new inferences
            const newInferences = await this._applyRules(focusTasks);

            // Update memory with new inferences
            this._updateMemoryWithInferences(newInferences, cycleStartTime);

            // Update cycle statistics
            this._updateCycleStats(cycleStartTime);

            return {
                cycleNumber: this._cycleCount,
                processedTasks: processedTasks.length,
                focusTasks: focusTasks.length,
                newInferences: newInferences.length,
                cycleTime: Date.now() - cycleStartTime,
                memoryStats: this._memory.getDetailedStats()
            };

        } catch (error) {
            this.logger.error('Error in reasoning cycle:', error);
            throw error;
        } finally {
            this._isRunning = false;
        }
    }

    /**
     * Get tasks from focus memory for reasoning
     * @returns {Array<Task>} - Tasks selected for reasoning
     */
    _getTasksForReasoning() {
        const maxTasks = this._config.maxTasksPerCycle;
        const activeConcepts = this._memory.getMostActiveConcepts(20);
        const selectedTasks = [];

        for (const concept of activeConcepts) {
            if (selectedTasks.length >= maxTasks) break;

            // Get highest priority tasks from this concept
            const conceptTasks = concept.getAllTasks().sort((a, b) => b.priority - a.priority);

            for (const task of conceptTasks) {
                if (selectedTasks.length >= maxTasks) break;
                selectedTasks.push(task);
            }
        }

        return selectedTasks;
    }

    /**
     * Apply rules to generate new inferences
     * @param {Array<Task>} tasks - Tasks to reason about
     * @returns {Array<Task>} - New inferences generated
     */
    async _applyRules(tasks) {
        const newInferences = [];

        for (const task of tasks) {
            try {
                // Get applicable rules for this task and apply them
                const applicableRules = this._ruleEngine.getApplicableRules(task);

                for (const rule of applicableRules) {
                    const ruleResults = await this._ruleEngine.applyRule(rule, task);

                    if (ruleResults?.length > 0) {
                        newInferences.push(...ruleResults);
                        this._stats.totalRulesApplied += ruleResults.length;
                    }
                }
            } catch (error) {
                this.logger.warn(`Error applying rules to task ${task.stamp.id}:`, error);
            }
        }

        return newInferences;
    }

    /**
     * Update memory with new inferences
     * @param {Array<Task>} inferences - New inferences to add
     * @param {number} currentTime - Current timestamp
     */
    _updateMemoryWithInferences(inferences, currentTime) {
        for (const inference of inferences) {
            // Add inference to memory
            this._memory.addTask(inference, currentTime);
            this._stats.totalTasksProcessed++;

            // Add to focus if priority is high enough
            if (inference.priority >= this._config.priorityThreshold) {
                this._focus.addTaskToFocus(inference, inference.priority);
            }
        }
    }

    /**
     * Update cycle statistics
     * @param {number} cycleStartTime - When the cycle started
     */
    _updateCycleStats(cycleStartTime) {
        this._cycleCount++;
        this._stats.totalCycles++;

        const cycleTime = Date.now() - cycleStartTime;

        // Update average cycle time (exponential moving average)
        if (this._stats.averageCycleTime === 0) {
            this._stats.averageCycleTime = cycleTime;
        } else {
            this._stats.averageCycleTime = this._stats.averageCycleTime * 0.9 + cycleTime * 0.1;
        }

        this._lastCycleTime = cycleTime;
    }

    /**
     * Execute multiple cycles
     * @param {number} count - Number of cycles to execute
     * @returns {Array<Object>} - Results from each cycle
     */
    async executeMultiple(count) {
        const results = [];

        for (let i = 0; i < count; i++) {
            try {
                const result = await this.execute();
                results.push(result);

                // Small delay between cycles if configured
                if (this._config.delay > 0) {
                    await this._delay(this._config.delay);
                }
            } catch (error) {
                this.logger.error(`Error in cycle ${i + 1}:`, error);
                results.push({
                    cycleNumber: this._cycleCount,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Reset cycle state
     */
    reset() {
        this._cycleCount = 0;
        this._isRunning = false;
        this._lastCycleTime = 0;

        this._stats = {
            totalCycles: 0,
            totalTasksProcessed: 0,
            totalRulesApplied: 0,
            averageCycleTime: 0,
            createdAt: Date.now()
        };
    }

    /**
     * Get detailed cycle information for debugging
     * @returns {Object} - Detailed cycle state
     */
    getDebugInfo() {
        return {
            cycleCount: this._cycleCount,
            isRunning: this._isRunning,
            lastCycleTime: this._lastCycleTime,
            stats: this._stats,
            config: this._config,
            memoryStats: this._memory.getDetailedStats(),
            focusStats: this._focus.getStats ? this._focus.getStats() : null,
            taskManagerStats: this._taskManager.stats
        };
    }

    /**
     * Simple delay utility
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after delay
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}