import { SystemConfig } from './SystemConfig.js';
import { Memory } from '../memory/Memory.js';
import { TaskManager } from '../task/TaskManager.js';
import { Cycle } from './Cycle.js';
import { NarseseParser } from '../../parser/NarseseParser.js';
import { EventBus } from '../../util/EventBus.js';
import { RuleEngine } from '../reasoning/RuleEngine.js';
import { DeductionRule } from '../reasoning/rules/deduction.js';
import { PRIORITY, TRUTH } from '../config/constants.js';
import { Logger } from '../../util/Logger.js';

export class NAR {
    constructor(config = {}) {
        this._config = SystemConfig.from(config);
        this.logger = Logger;

        this._memory = new Memory(this._config.memory);
        this._parser = new NarseseParser();
        this._eventBus = new EventBus();

        this._focus = {
            addTaskToFocus: (task, priority) => {},
            getStats: () => ({focusSets: 0, totalTasks: 0})
        };

        this._taskManager = new TaskManager(this._memory, this._focus, this._config.taskManager);

        this._ruleEngine = new RuleEngine(this._config.ruleEngine);
        this._setupDefaultRules();

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

    _setupDefaultRules() {
        try {
            this._ruleEngine.register(new DeductionRule());
        } catch (error) {
            this.logger.warn('Error setting up default rules:', error);
        }
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
             if (!parsed?.term) throw new Error('Invalid parse result');

             const task = this._createTask(parsed);
             const added = this._taskManager.addTask(task);

             if (added) {
                 this._eventBus.emit('task.input', { task, source: 'user', originalInput: narseseString, parsed });
                 await this._processPendingTasks();
             }
             return added;
         } catch (error) {
             return this._handleInputError(error, narseseString);
         }
     }

     _createTask(parsed) {
         const taskCreators = {
             BELIEF: () => this._taskManager.createBelief(parsed.term, parsed.truthValue, this._calculateInputPriority(parsed)),
             GOAL: () => this._taskManager.createGoal(parsed.term, parsed.truthValue, this._calculateInputPriority(parsed)),
             QUESTION: () => this._taskManager.createQuestion(parsed.term, this._calculateInputPriority(parsed))
         };

         const taskCreator = taskCreators[parsed.taskType];
         if (!taskCreator) throw new Error(`Unknown task type: ${parsed.taskType}`);

         return taskCreator();
     }

     _handleInputError(error, input) {
         this._eventBus.emit('input.error', { error: error.message, input });
         throw error;
     }

    start() {
        if (this._isRunning) return false;

        this._isRunning = true;
        this._processPendingTasks();

        this._cycleInterval = setInterval(async () => {
            try {
                await this._executeCycle();
            } catch (error) {
                this.logger.error('Error in reasoning cycle:', error);
                this._eventBus.emit('cycle.error', { error: error.message });
            }
        }, this._config.cycle.delay);

        return this._eventBus.emit('system.started', { timestamp: Date.now() }), true;
    }

    stop() {
        if (!this._isRunning) return false;

        this._isRunning = false;
        if (this._cycleInterval) {
            clearInterval(this._cycleInterval);
            this._cycleInterval = null;
        }

        this._eventBus.emit('system.stopped', { timestamp: Date.now() });
        return true;
    }

    async step() {
        try {
            await this._processPendingTasks();
            const result = await this._cycle.execute();
            this._eventBus.emit('cycle.completed', result);
            return result;
        } catch (error) {
            this._eventBus.emit('cycle.error', { error: error.message });
            throw error;
        }
    }

    async runCycles(count) {
        const results = [];
        for (let i = 0; i < count; i++) {
            try {
                results.push(await this.step());
            } catch (error) {
                results.push({ error: error.message, cycleNumber: i + 1 });
            }
        }
        return results;
    }

    query(queryTerm) { return this._memory.getConcept(queryTerm)?.getTasksByType('BELIEF') || []; }

    getBeliefs(queryTerm = null) {
        return queryTerm ? this.query(queryTerm) : Array.from(this._memory.getAllConcepts()).flatMap(concept => concept.getTasksByType('BELIEF'));
    }

    getGoals() { return this._taskManager.findTasksByType('GOAL'); }
    getQuestions() { return this._taskManager.findTasksByType('QUESTION'); }

    reset() {
        this.stop();
        this._memory.clear();
        this._taskManager.clearPendingTasks();
        this._cycle.reset();
        this._eventBus.emit('system.reset', { timestamp: Date.now() });
    }

    on(eventName, callback) { this._eventBus.on(eventName, callback); }
    off(eventName, callback) { this._eventBus.off(eventName, callback); }

    getStats() {
        return {
            isRunning: this._isRunning,
            cycleCount: this._cycle.cycleCount,
            memoryStats: this._memory.getDetailedStats(),
            taskManagerStats: this._taskManager.getTaskStats ? 
                this._taskManager.getTaskStats() : this._taskManager.stats,
            cycleStats: this._cycle.stats,
            config: this._config.toJSON()
        };
    }

    _calculateInputPriority(parsed) {
        let priority = this._config.taskManager.defaultPriority;
        
        // Add confidence boost if available
        if (parsed.truthValue?.confidence) {
            priority += parsed.truthValue.confidence * PRIORITY.CONFIDENCE_MULTIPLIER;
        }
        
        // Add task type boost
        const typeBoost = { GOAL: PRIORITY.GOAL_BOOST, QUESTION: PRIORITY.QUESTION_BOOST }[parsed.taskType] || 0;
        priority += typeBoost;
        
        return Math.min(TRUTH.MAX_PRIORITY, priority);
    }

    async _processPendingTasks() {
        for (const task of this._taskManager.processPendingTasks(Date.now())) {
            this._eventBus.emit('task.added', { task });
        }
    }

    async _executeCycle() { this._eventBus.emit('cycle.completed', await this._cycle.execute()); }

    _setupDefaultEventHandlers() {
        this._eventBus.on('task.input', (data) => {
            if (this._config.debug.enabled) this.logger.log('debug', `Input: ${data.originalInput} -> ${data.task.type}`);
        });

        this._eventBus.on('cycle.error', (data) => this.logger.error('Cycle error:', data.error));
        this._eventBus.on('input.error', (data) => this.logger.error('Input error:', data.error));
    }
}
