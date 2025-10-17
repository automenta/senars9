import {SystemConfig} from './SystemConfig.js';
import {Memory} from '../memory/Memory.js';
import {TaskManager} from '../task/TaskManager.js';
import {Cycle} from './Cycle.js';
import {NarseseParser} from '../../parser/NarseseParser.js';
import {EventBus} from '../../util/EventBus.js';

export class NAR {
    constructor(config = {}) {
        this._config = SystemConfig.from(config);

        this._memory = new Memory(this._config.memory);
        this._taskManager = new TaskManager(this._memory, null, this._config.taskManager);
        this._parser = new NarseseParser();
        this._eventBus = new EventBus();

        this._focus = {
            addTaskToFocus: (task, priority) => {
            },
            getStats: () => ({focusSets: 0, totalTasks: 0})
        };

        this._taskManager = new TaskManager(this._memory, this._focus, this._config.taskManager);

        this._ruleEngine = {
            getApplicableRules: () => [],
            applyRule: () => []
        };

        this._cycle = new Cycle({
            memory: this._memory,
            focus: this._focus,
            ruleEngine: this._ruleEngine,
            taskManager: this._taskManager,
            config: this._config.cycle
        });

        this._isRunning = false;
        this._cycleInterval = null;

        this._setupDefaultEventHandlers();
    }

    get config() {
        return this._config;
    }

    get memory() {
        return this._memory;
    }

    get isRunning() {
        return this._isRunning;
    }

    get cycleCount() {
        return this._cycle.cycleCount;
    }

    async input(narseseString) {
        try {
            const parsed = this._parser.parse(narseseString);

            const task = {
                BELIEF: () => this._taskManager.createBelief(parsed.term, parsed.truthValue, this._calculateInputPriority(parsed)),
                GOAL: () => this._taskManager.createGoal(parsed.term, parsed.truthValue, this._calculateInputPriority(parsed)),
                QUESTION: () => this._taskManager.createQuestion(parsed.term, this._calculateInputPriority(parsed))
            }[parsed.taskType]?.() ?? (() => {
                throw new Error(`Unknown task type: ${parsed.taskType}`);
            })();

            const added = this._taskManager.addTask(task);

            if (added) {
                this._eventBus.emit('task.input', {
                    task,
                    source: 'user',
                    originalInput: narseseString,
                    parsed
                });

                await this._processPendingTasks();
            }

            return added;

        } catch (error) {
            this._eventBus.emit('input.error', {
                error: error.message,
                input: narseseString,
                type: 'SYNTAX_ERROR'
            });
            throw error;
        }
    }

    start() {
        if (this._isRunning) return false;

        this._isRunning = true;
        this._processPendingTasks();

        this._cycleInterval = setInterval(async () => {
            try {
                await this._executeCycle();
            } catch (error) {
                console.error('Error in reasoning cycle:', error);
                this._eventBus.emit('cycle.error', {error: error.message});
            }
        }, this._config.cycle.delay);

        this._eventBus.emit('system.started', {timestamp: Date.now()});
        return true;
    }

    stop() {
        if (!this._isRunning) return false;

        this._isRunning = false;

        if (this._cycleInterval) {
            clearInterval(this._cycleInterval);
            this._cycleInterval = null;
        }

        this._eventBus.emit('system.stopped', {timestamp: Date.now()});
        return true;
    }

    async step() {
        try {
            await this._processPendingTasks();
            const result = await this._cycle.execute();
            this._eventBus.emit('cycle.completed', result);
            return result;
        } catch (error) {
            this._eventBus.emit('cycle.error', {error: error.message});
            throw error;
        }
    }

    async runCycles(count) {
        const results = [];
        for (let i = 0; i < count; i++) {
            try {
                const result = await this.step();
                results.push(result);
            } catch (error) {
                results.push({error: error.message, cycleNumber: i + 1});
            }
        }
        return results;
    }

    query(queryTerm) {
        const concept = this._memory.getConcept(queryTerm);
        return concept ? concept.getTasksByType('BELIEF') : [];
    }

    getBeliefs(queryTerm = null) {
        if (queryTerm) return this.query(queryTerm);

        const allBeliefs = [];
        for (const concept of this._memory.getAllConcepts()) {
            allBeliefs.push(...concept.getTasksByType('BELIEF'));
        }
        return allBeliefs;
    }

    getGoals() {
        return this._taskManager.findTasksByType('GOAL');
    }

    getQuestions() {
        return this._taskManager.findTasksByType('QUESTION');
    }

    reset() {
        this.stop();
        this._memory.clear();
        this._taskManager.clearPendingTasks();
        this._cycle.reset();
        this._eventBus.emit('system.reset', {timestamp: Date.now()});
    }

    on(eventName, callback) {
        this._eventBus.on(eventName, callback);
    }

    off(eventName, callback) {
        this._eventBus.off(eventName, callback);
    }

    getStats() {
        return {
            isRunning: this._isRunning,
            cycleCount: this._cycle.cycleCount,
            memoryStats: this._memory.getDetailedStats(),
            taskManagerStats: this._taskManager.getTaskStats ? this._taskManager.getTaskStats() : this._taskManager.stats,
            cycleStats: this._cycle.stats,
            config: this._config.toJSON()
        };
    }

    _calculateInputPriority(parsed) {
        let priority = this._config.taskManager.defaultPriority;
        if (parsed.truthValue?.confidence) {
            priority = Math.min(1.0, priority + parsed.truthValue.confidence * 0.3);
        }
        priority = Math.min(1.0, priority + {GOAL: 0.2, QUESTION: 0.1}[parsed.taskType] || 0);
        return priority;
    }

    async _processPendingTasks() {
        const processedTasks = this._taskManager.processPendingTasks(Date.now());
        for (const task of processedTasks) {
            this._eventBus.emit('task.added', {task});
        }
    }

    async _executeCycle() {
        const result = await this._cycle.execute();
        this._eventBus.emit('cycle.completed', result);
    }

    _setupDefaultEventHandlers() {
        this._eventBus.on('task.input', (data) => {
            if (this._config.debug.enabled) {
                console.log(`Input: ${data.originalInput} -> ${data.task.type}`);
            }
        });

        this._eventBus.on('cycle.error', (data) => {
            console.error('Cycle error:', data.error);
        });

        this._eventBus.on('input.error', (data) => {
            console.error('Input error:', data.error);
        });
    }
}
