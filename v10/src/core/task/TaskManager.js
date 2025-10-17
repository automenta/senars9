import {Task} from './Task.js';

export class TaskManager {
    constructor(memory, focus, config) {
        this._memory = memory;
        this._focus = focus;
        this._config = config;

        // Task storage for pending tasks
        this._pendingTasks = new Map(); // Map<taskId, Task>

        // Statistics
        this._stats = {
            totalTasksCreated: 0,
            totalTasksProcessed: 0,
            tasksPending: 0,
            createdAt: Date.now()
        };
    }

    // Getters
    get stats() {
        return {...this._stats};
    }

    get pendingTasksCount() {
        return this._pendingTasks.size;
    }

    /**
     * Add a task to the system
     * @param {Task} task - The task to add
     * @returns {boolean} - True if task was added successfully
     */
    addTask(task) {
        if (!(task instanceof Task)) {
            throw new Error('TaskManager.addTask requires a Task instance');
        }

        // Add to pending tasks for processing
        this._pendingTasks.set(task.stamp.id, task);
        this._stats.totalTasksCreated++;
        this._stats.tasksPending = this._pendingTasks.size;

        return true;
    }

    /**
     * Process all pending tasks (add them to memory and focus)
     * @param {number} currentTime - Current timestamp
     * @returns {Array<Task>} - Array of tasks that were processed
     */
    processPendingTasks(currentTime = Date.now()) {
        const processedTasks = [];

        for (const [taskId, task] of this._pendingTasks) {
            // Add to memory
            const addedToMemory = this._memory.addTask(task, currentTime);

            if (addedToMemory) {
                // Add to focus if priority is high enough
                if (this._focus && task.priority >= this._config.priorityThreshold) {
                    this._focus.addTaskToFocus(task, task.priority);
                }

                processedTasks.push(task);
                this._stats.totalTasksProcessed++;
            }
        }

        // Clear processed tasks
        this._pendingTasks.clear();
        this._stats.tasksPending = 0;

        return processedTasks;
    }

    _createTask(type, term, truth = null, priority) {
        return new Task({
            term,
            truth,
            type,
            priority: priority ?? this._config.defaultPriority,
            budget: this._config.defaultBudget
        });
    }

    createBelief(term, truth, priority) {
        return this._createTask('BELIEF', term, truth, priority);
    }

    createGoal(term, truth = null, priority) {
        return this._createTask('GOAL', term, truth, priority);
    }

    createQuestion(term, priority) {
        return this._createTask('QUESTION', term, null, priority);
    }

    /**
     * Find tasks by term across all concepts
     * @param {Term} term - Term to search for
     * @returns {Array<Task>} - Array of matching tasks
     */
    findTasksByTerm(term) {
        const concept = this._memory.getConcept(term);
        return concept ? concept.getAllTasks() : [];
    }

    /**
     * Find tasks by type across all concepts
     * @param {string} taskType - Type of task (BELIEF, GOAL, QUESTION)
     * @returns {Array<Task>} - Array of matching tasks
     */
    findTasksByType(taskType) {
        const allTasks = [];

        for (const concept of this._memory.getAllConcepts()) {
            allTasks.push(...concept.getTasksByType(taskType));
        }

        return allTasks;
    }

    /**
     * Find tasks by priority range
     * @param {number} minPriority - Minimum priority (inclusive)
     * @param {number} maxPriority - Maximum priority (inclusive)
     * @returns {Array<Task>} - Array of tasks in priority range
     */
    findTasksByPriority(minPriority = 0, maxPriority = 1) {
        const allTasks = [];

        for (const concept of this._memory.getAllConcepts()) {
            for (const task of concept.getAllTasks()) {
                if (task.priority >= minPriority && task.priority <= maxPriority) {
                    allTasks.push(task);
                }
            }
        }

        return allTasks;
    }

    /**
     * Find tasks by recency (created after timestamp)
     * @param {number} sinceTimestamp - Timestamp to search from
     * @returns {Array<Task>} - Array of recent tasks
     */
    findRecentTasks(sinceTimestamp) {
        const allTasks = [];

        for (const concept of this._memory.getAllConcepts()) {
            for (const task of concept.getAllTasks()) {
                if (task.createdAt >= sinceTimestamp) {
                    allTasks.push(task);
                }
            }
        }

        return allTasks;
    }

    /**
     * Get the highest priority tasks across all concepts
     * @param {number} limit - Maximum number of tasks to return
     * @returns {Array<Task>} - Highest priority tasks
     */
    getHighestPriorityTasks(limit = 10) {
        const allTasks = [];

        for (const concept of this._memory.getAllConcepts()) {
            allTasks.push(...concept.getAllTasks());
        }

        // Sort by priority (highest first)
        allTasks.sort((a, b) => b.priority - a.priority);

        return allTasks.slice(0, limit);
    }

    /**
     * Update priority of a specific task
     * @param {Task} task - Task to update
     * @param {number} newPriority - New priority value
     * @returns {boolean} - True if task was found and updated
     */
    updateTaskPriority(task, newPriority) {
        const concept = this._memory.getConcept(task.term);
        if (!concept) return false;

        return concept.updateTaskPriority(task, newPriority);
    }

    /**
     * Remove a specific task from the system
     * @param {Task} task - Task to remove
     * @returns {boolean} - True if task was found and removed
     */
    removeTask(task) {
        const concept = this._memory.getConcept(task.term);
        if (!concept) return false;

        const removed = concept.removeTask(task);

        if (removed) {
            this._stats.totalTasksProcessed++;
        }

        return removed;
    }

    /**
     * Get tasks that need attention (high priority, recent, etc.)
     * @param {Object} criteria - Selection criteria
     * @returns {Array<Task>} - Tasks needing attention
     */
    getTasksNeedingAttention(criteria = {}) {
        const {
            minPriority = 0.7,
            maxAge = 60000, // 1 minute
            limit = 20
        } = criteria;

        const currentTime = Date.now();
        const allTasks = [];

        for (const concept of this._memory.getAllConcepts()) {
            for (const task of concept.getAllTasks()) {
                // Filter by priority and age
                if (task.priority >= minPriority &&
                    (currentTime - task.createdAt) <= maxAge) {
                    allTasks.push(task);
                }
            }
        }

        // Sort by priority and recency
        allTasks.sort((a, b) => {
            const priorityDiff = b.priority - a.priority;
            if (priorityDiff !== 0) return priorityDiff;

            return b.createdAt - a.createdAt;
        });

        return allTasks.slice(0, limit);
    }

    /**
     * Get task statistics for monitoring
     * @returns {Object} - Task statistics
     */
    getTaskStats() {
        const tasksByType = {
            BELIEF: 0,
            GOAL: 0,
            QUESTION: 0
        };

        const priorityDistribution = {
            low: 0,    // 0-0.3
            medium: 0, // 0.3-0.7
            high: 0    // 0.7-1.0
        };

        let totalPriority = 0;
        let oldestTask = Date.now();
        let newestTask = 0;

        for (const concept of this._memory.getAllConcepts()) {
            for (const task of concept.getAllTasks()) {
                // Count by type
                if (tasksByType[task.type] !== undefined) {
                    tasksByType[task.type]++;
                }

                // Priority distribution
                priorityDistribution[task.priority < 0.3 ? 'low' : task.priority < 0.7 ? 'medium' : 'high']++;

                totalPriority += task.priority;

                // Age tracking
                if (task.createdAt < oldestTask) oldestTask = task.createdAt;
                if (task.createdAt > newestTask) newestTask = task.createdAt;
            }
        }

        const totalTasks = Object.values(tasksByType).reduce((sum, count) => sum + count, 0);
        const averagePriority = totalTasks > 0 ? totalPriority / totalTasks : 0;

        return {
            ...this._stats,
            tasksByType,
            priorityDistribution,
            averagePriority,
            oldestTask,
            newestTask,
            ageRange: newestTask - oldestTask
        };
    }

    /**
     * Clear all pending tasks without processing them
     */
    clearPendingTasks() {
        this._pendingTasks.clear();
        this._stats.tasksPending = 0;
    }

    /**
     * Check if a task exists in the system
     * @param {Task} task - Task to check
     * @returns {boolean} - True if task exists
     */
    hasTask(task) {
        const concept = this._memory.getConcept(task.term);
        return concept ? concept.containsTask(task) : false;
    }

    /**
     * Get all pending tasks (for debugging)
     * @returns {Array<Task>} - Array of pending tasks
     */
    getPendingTasks() {
        return Array.from(this._pendingTasks.values());
    }
}