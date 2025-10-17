import {Task} from './Task.js';
import {sortByPriority, collectTasksFromAllConcepts} from '../../util/common.js';

export class TaskManager {
    constructor(memory, focus, config) {
        this._memory = memory;
        this._focus = focus;
        this._config = config;
        this._pendingTasks = new Map(); // Map<taskId, Task>
        this._stats = {
            totalTasksCreated: 0,
            totalTasksProcessed: 0,
            tasksPending: 0,
            createdAt: Date.now()
        };
    }

    get stats() { return {...this._stats}; }
    get pendingTasksCount() { return this._pendingTasks.size; }

    addTask(task) {
        if (!(task instanceof Task)) {
            throw new Error('TaskManager.addTask requires a Task instance');
        }

        this._pendingTasks.set(task.stamp.id, task);
        this._stats.totalTasksCreated++;
        this._stats.tasksPending = this._pendingTasks.size;
        return true;
    }

    processPendingTasks(currentTime = Date.now()) {
        const processedTasks = [];

        for (const [taskId, task] of this._pendingTasks) {
            const addedToMemory = this._memory.addTask(task, currentTime);

            if (addedToMemory) {
                if (this._focus && task.priority >= this._config.priorityThreshold) {
                    this._focus.addTaskToFocus(task, task.priority);
                }

                processedTasks.push(task);
                this._stats.totalTasksProcessed++;
            }
        }

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

    findTasksByTerm(term) {
        const concept = this._memory.getConcept(term);
        return concept ? concept.getAllTasks() : [];
    }

    _collectTasksFromAllConcepts(filterFn = null) {
        return collectTasksFromAllConcepts(this._memory, filterFn);
    }

    findTasksByType(taskType) {
        const allTasks = [];
        for (const concept of this._memory.getAllConcepts()) {
            allTasks.push(...concept.getTasksByType(taskType));
        }
        return allTasks;
    }

    findTasksByPriority(minPriority = 0, maxPriority = 1) {
        return this._collectTasksFromAllConcepts(
            task => task.priority >= minPriority && task.priority <= maxPriority
        );
    }

    findRecentTasks(sinceTimestamp) {
        return this._collectTasksFromAllConcepts(
            task => task.createdAt >= sinceTimestamp
        );
    }

    getHighestPriorityTasks(limit = 10) {
        const allTasks = this._collectTasksFromAllConcepts();
        return sortByPriority(allTasks).slice(0, limit);
    }

    updateTaskPriority(task, newPriority) {
        const concept = this._memory.getConcept(task.term);
        if (!concept) return false;
        return concept.updateTaskPriority(task, newPriority);
    }

    removeTask(task) {
        const concept = this._memory.getConcept(task.term);
        if (!concept) return false;

        const removed = concept.removeTask(task);
        if (removed) {
            this._stats.totalTasksProcessed++;
        }
        return removed;
    }

    getTasksNeedingAttention(criteria = {}) {
        const { minPriority = 0.7, maxAge = 60000, limit = 20 } = criteria;
        const currentTime = Date.now();

        let allTasks = this._collectTasksFromAllConcepts(task => {
            return task.priority >= minPriority &&
                (currentTime - task.createdAt) <= maxAge;
        });

        allTasks.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);
        return allTasks.slice(0, limit);
    }

    getTaskStats() {
        const tasksByType = { BELIEF: 0, GOAL: 0, QUESTION: 0 };
        const priorityDistribution = { low: 0, medium: 0, high: 0 };
        let totalPriority = 0;
        let oldestTask = Date.now();
        let newestTask = 0;

        for (const concept of this._memory.getAllConcepts()) {
            for (const task of concept.getAllTasks()) {
                tasksByType[task.type]++;
                priorityDistribution[task.priority < 0.3 ? 'low' : task.priority < 0.7 ? 'medium' : 'high']++;
                totalPriority += task.priority;
                oldestTask = Math.min(oldestTask, task.createdAt);
                newestTask = Math.max(newestTask, task.createdAt);
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

    clearPendingTasks() {
        this._pendingTasks.clear();
        this._stats.tasksPending = 0;
    }

    hasTask(task) {
        const concept = this._memory.getConcept(task.term);
        return concept ? concept.containsTask(task) : false;
    }

    getPendingTasks() {
        return Array.from(this._pendingTasks.values());
    }
}