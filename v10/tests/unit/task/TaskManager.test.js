import {jest} from '@jest/globals';
import {TaskManager} from '../../../src/core/task/TaskManager.js';
import {Task} from '../../../src/core/task/Task.js';
import {Stamp} from '../../../src/core/Stamp.js';
import {TermFactory} from '../../../src/core/term/TermFactory.js';

describe('TaskManager', () => {
    let taskManager;
    let memory;
    let focus;
    let config;
    let termFactory;
    let newAtom;

    beforeEach(() => {
        termFactory = new TermFactory();
        newAtom = name => termFactory.create({components: [name]});

        // Mock memory
        memory = {
            addTask: jest.fn(),
            getConcept: jest.fn(),
            getAllConcepts: jest.fn(() => [])
        };

        // Mock focus
        focus = {
            addTaskToFocus: jest.fn()
        };

        config = {
            priorityThreshold: 0.5,
            defaultPriority: 0.5,
            defaultBudget: 1.0
        };

        taskManager = new TaskManager(memory, focus, config);
    });

    test('should initialize with correct default state', () => {
        expect(taskManager.stats.totalTasksCreated).toBe(0);
        expect(taskManager.stats.totalTasksProcessed).toBe(0);
        expect(taskManager.stats.tasksPending).toBe(0);
        expect(taskManager.pendingTasksCount).toBe(0);
    });

    test('should add tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            type: 'BELIEF'
        });

        const added = taskManager.addTask(task);

        expect(added).toBe(true);
        expect(taskManager.stats.totalTasksCreated).toBe(1);
        expect(taskManager.stats.tasksPending).toBe(1);
        expect(taskManager.pendingTasksCount).toBe(1);
    });

    test('should reject non-Task objects', () => {
        expect(() => {
            taskManager.addTask({term: 'A', type: 'BELIEF'});
        }).toThrow('TaskManager.addTask requires a Task instance');

        expect(() => {
            taskManager.addTask(null);
        }).toThrow('TaskManager.addTask requires a Task instance');

        expect(() => {
            taskManager.addTask('not a task');
        }).toThrow('TaskManager.addTask requires a Task instance');
    });

    test('should process pending tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            type: 'BELIEF',
            priority: 0.8
        });

        memory.addTask.mockReturnValue(true);

        taskManager.addTask(task);
        const processedTasks = taskManager.processPendingTasks();

        expect(processedTasks).toHaveLength(1);
        expect(processedTasks[0]).toBe(task);
        expect(memory.addTask).toHaveBeenCalledWith(task, expect.any(Number));
        expect(focus.addTaskToFocus).toHaveBeenCalledWith(task, 0.8);
        expect(taskManager.stats.totalTasksProcessed).toBe(1);
        expect(taskManager.stats.tasksPending).toBe(0);
    });

    test('should not add high priority tasks to focus if below threshold', () => {
        const term = newAtom('A');
        const task = new Task({
            term,
            truth: {frequency: 0.9, confidence: 0.8},
            type: 'BELIEF',
            priority: 0.3 // Below threshold
        });

        memory.addTask.mockReturnValue(true);

        taskManager.addTask(task);
        taskManager.processPendingTasks();

        expect(focus.addTaskToFocus).not.toHaveBeenCalled();
    });

    test('should create belief tasks correctly', () => {
        const term = newAtom('A');
        const truth = {frequency: 0.9, confidence: 0.8};

        const belief = taskManager.createBelief(term, truth, 0.7);

        expect(belief.term).toBe(term);
        expect(belief.truth).toBe(truth);
        expect(belief.type).toBe('BELIEF');
        expect(belief.priority).toBe(0.7);
        expect(belief.budget).toBe(1.0);
    });

    test('should create belief tasks with default priority', () => {
        const term = newAtom('A');
        const truth = {frequency: 0.9, confidence: 0.8};

        const belief = taskManager.createBelief(term, truth);

        expect(belief.priority).toBe(0.5); // Default priority
    });

    test('should create goal tasks correctly', () => {
        const term = newAtom('A');
        const truth = {frequency: 0.9, confidence: 0.8};

        const goal = taskManager.createGoal(term, truth, 0.6);

        expect(goal.term).toBe(term);
        expect(goal.truth).toBe(truth);
        expect(goal.type).toBe('GOAL');
        expect(goal.priority).toBe(0.6);
        expect(goal.budget).toBe(1.0);
    });

    test('should create goal tasks without truth value', () => {
        const term = newAtom('A');

        const goal = taskManager.createGoal(term);

        expect(goal.term).toBe(term);
        expect(goal.truth).toBeNull();
        expect(goal.type).toBe('GOAL');
    });

    test('should create question tasks correctly', () => {
        const term = newAtom('A');

        const question = taskManager.createQuestion(term, 0.6);

        expect(question.term).toBe(term);
        expect(question.truth).toBeNull();
        expect(question.type).toBe('QUESTION');
        expect(question.priority).toBe(0.6);
        expect(question.budget).toBe(1.0);
    });

    test('should find tasks by term correctly', () => {
        const term = newAtom('A');
        const mockConcept = {
            getAllTasks: jest.fn(() => [
                new Task({term, type: 'BELIEF'}),
                new Task({term, type: 'GOAL'})
            ])
        };

        memory.getConcept.mockReturnValue(mockConcept);

        const tasks = taskManager.findTasksByTerm(term);

        expect(tasks).toHaveLength(2);
        expect(memory.getConcept).toHaveBeenCalledWith(term);
    });

    test('should return empty array for non-existent term', () => {
        memory.getConcept.mockReturnValue(null);

        const tasks = taskManager.findTasksByTerm(newAtom('A'));

        expect(tasks).toHaveLength(0);
    });

    test('should find tasks by type correctly', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');

        const mockConceptA = {
            getTasksByType: jest.fn((type) => {
                if (type === 'BELIEF') return [new Task({term: termA, type: 'BELIEF'})];
                return [];
            })
        };

        const mockConceptB = {
            getTasksByType: jest.fn((type) => {
                if (type === 'BELIEF') return [new Task({term: termB, type: 'BELIEF'})];
                return [];
            })
        };

        memory.getAllConcepts.mockReturnValue([mockConceptA, mockConceptB]);

        const beliefs = taskManager.findTasksByType('BELIEF');

        expect(beliefs).toHaveLength(2);
        expect(mockConceptA.getTasksByType).toHaveBeenCalledWith('BELIEF');
        expect(mockConceptB.getTasksByType).toHaveBeenCalledWith('BELIEF');
    });

    test('should find tasks by priority range correctly', () => {
        const term = newAtom('A');

        const mockConcept = {
            getAllTasks: jest.fn(() => [
                new Task({term, type: 'BELIEF', priority: 0.2}),
                new Task({term, type: 'BELIEF', priority: 0.5}),
                new Task({term, type: 'BELIEF', priority: 0.8})
            ])
        };

        memory.getAllConcepts.mockReturnValue([mockConcept]);

        const mediumPriorityTasks = taskManager.findTasksByPriority(0.3, 0.7);

        expect(mediumPriorityTasks).toHaveLength(1);
        expect(mediumPriorityTasks[0].priority).toBe(0.5);
    });

    test('should find recent tasks correctly', () => {
        const term = newAtom('A');
        const now = Date.now();
        const tasks = [
            new Task({term, type: 'BELIEF', stamp: Stamp.createInput(now - 1000, now - 1000)}),
            new Task({term, type: 'BELIEF', stamp: Stamp.createInput(now - 500, now - 500)}),
            new Task({term, type: 'BELIEF', stamp: Stamp.createInput(now - 2000, now - 2000)})
        ];

        const mockConcept = {
            getAllTasks: jest.fn(() => tasks)
        };

        memory.getAllConcepts.mockReturnValue([mockConcept]);

        const recentTasks = taskManager.findRecentTasks(now - 1500);

        expect(recentTasks).toHaveLength(2);
        // Note: Sorting might affect order, so check for presence instead of exact order
        expect(recentTasks.find(t => t.createdAt === now - 500)).toBeDefined();
        expect(recentTasks.find(t => t.createdAt === now - 1000)).toBeDefined();
    });

    test('should get highest priority tasks correctly', () => {
        const term = newAtom('A');

        const mockConcept = {
            getAllTasks: jest.fn(() => [
                new Task({term, type: 'BELIEF', priority: 0.3}),
                new Task({term, type: 'BELIEF', priority: 0.8}),
                new Task({term, type: 'BELIEF', priority: 0.6})
            ])
        };

        memory.getAllConcepts.mockReturnValue([mockConcept]);

        const highestPriorityTasks = taskManager.getHighestPriorityTasks(2);

        expect(highestPriorityTasks).toHaveLength(2);
        expect(highestPriorityTasks[0].priority).toBe(0.8);
        expect(highestPriorityTasks[1].priority).toBe(0.6);
    });

    test('should update task priority correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF', priority: 0.5});

        const mockConcept = {
            updateTaskPriority: jest.fn(() => true)
        };

        memory.getConcept.mockReturnValue(mockConcept);

        const updated = taskManager.updateTaskPriority(task, 0.7);

        expect(updated).toBe(true);
        expect(memory.getConcept).toHaveBeenCalledWith(term);
        expect(mockConcept.updateTaskPriority).toHaveBeenCalledWith(task, 0.7);
    });

    test('should return false when updating priority of non-existent task', () => {
        memory.getConcept.mockReturnValue(null);

        const updated = taskManager.updateTaskPriority(
            new Task({term: newAtom('A'), type: 'BELIEF'}),
            0.7
        );

        expect(updated).toBe(false);
    });

    test('should remove tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        const mockConcept = {
            removeTask: jest.fn(() => true)
        };

        memory.getConcept.mockReturnValue(mockConcept);

        const removed = taskManager.removeTask(task);

        expect(removed).toBe(true);
        expect(taskManager.stats.totalTasksProcessed).toBe(1);
    });

    test('should return false when removing non-existent task', () => {
        memory.getConcept.mockReturnValue(null);

        const removed = taskManager.removeTask(
            new Task({term: newAtom('A'), type: 'BELIEF'})
        );

        expect(removed).toBe(false);
    });

    test('should get tasks needing attention correctly', () => {
        const term = newAtom('A');
        const now = Date.now();

        const mockConcept = {
            getAllTasks: jest.fn(() => [
                new Task({term, type: 'BELIEF', priority: 0.8, createdAt: now - 30000}),
                new Task({term, type: 'BELIEF', priority: 0.5, createdAt: now - 90000}),
                new Task({term, type: 'BELIEF', priority: 0.9, createdAt: now - 1000})
            ])
        };

        memory.getAllConcepts.mockReturnValue([mockConcept]);

        const attentionTasks = taskManager.getTasksNeedingAttention({
            minPriority: 0.7,
            maxAge: 60000,
            limit: 5
        });

        expect(attentionTasks).toHaveLength(2);
        expect(attentionTasks[0].priority).toBe(0.9);
        expect(attentionTasks[1].priority).toBe(0.8);
    });

    test('should provide comprehensive task statistics', () => {
        const termA = newAtom('A');
        const termB = newAtom('B');

        const mockConceptA = {
            getAllTasks: jest.fn(() => [
                new Task({term: termA, type: 'BELIEF', priority: 0.2}),
                new Task({term: termA, type: 'GOAL', priority: 0.5})
            ])
        };

        const mockConceptB = {
            getAllTasks: jest.fn(() => [
                new Task({term: termB, type: 'BELIEF', priority: 0.8})
            ])
        };

        memory.getAllConcepts.mockReturnValue([mockConceptA, mockConceptB]);

        const stats = taskManager.getTaskStats();

        expect(stats.tasksByType.BELIEF).toBe(2);
        expect(stats.tasksByType.GOAL).toBe(1);
        expect(stats.tasksByType.QUESTION).toBe(0);
        expect(stats.priorityDistribution.low).toBe(1);
        expect(stats.priorityDistribution.medium).toBe(1);
        expect(stats.priorityDistribution.high).toBe(1);
        expect(stats.averagePriority).toBeCloseTo(0.5, 1);
    });

    test('should clear pending tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        taskManager.addTask(task);
        expect(taskManager.stats.tasksPending).toBe(1);

        taskManager.clearPendingTasks();
        expect(taskManager.stats.tasksPending).toBe(0);
        expect(taskManager.pendingTasksCount).toBe(0);
    });

    test('should check task existence correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        const mockConcept = {
            containsTask: jest.fn(() => true)
        };

        memory.getConcept.mockReturnValue(mockConcept);

        const exists = taskManager.hasTask(task);

        expect(exists).toBe(true);
        expect(memory.getConcept).toHaveBeenCalledWith(term);
    });

    test('should return false for non-existent task', () => {
        memory.getConcept.mockReturnValue(null);

        const exists = taskManager.hasTask(
            new Task({term: newAtom('A'), type: 'BELIEF'})
        );

        expect(exists).toBe(false);
    });

    test('should get pending tasks correctly', () => {
        const term = newAtom('A');
        const task = new Task({term, type: 'BELIEF'});

        taskManager.addTask(task);
        const pendingTasks = taskManager.getPendingTasks();

        expect(pendingTasks).toHaveLength(1);
        expect(pendingTasks[0]).toBe(task);
    });

    test('should handle edge cases and error conditions', () => {
        // Test with null memory
        expect(() => {
            new TaskManager(null, focus, config);
        }).not.toThrow();

        // Test with null focus
        expect(() => {
            new TaskManager(memory, null, config);
        }).not.toThrow();

        // Test with null config
        expect(() => {
            new TaskManager(memory, focus, null);
        }).not.toThrow();

        // Test processing with no pending tasks
        const processedTasks = taskManager.processPendingTasks();
        expect(processedTasks).toHaveLength(0);

        // Test finding tasks when memory returns no concepts
        const tasks = taskManager.findTasksByType('BELIEF');
        expect(tasks).toHaveLength(0);
    });
});