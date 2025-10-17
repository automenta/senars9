import { SystemConfig } from './SystemConfig.js';
import { Memory } from '../memory/Memory.js';
import { TaskManager } from '../task/TaskManager.js';
import { Cycle } from './Cycle.js';
import { NarseseParser } from '../../parser/NarseseParser.js';
import { EventBus } from '../../util/EventBus.js';

export class NAR {
  constructor(config = {}) {
    // Initialize configuration
    this._config = SystemConfig.from(config);

    // Initialize core components
    this._memory = new Memory(this._config.memory);
    this._taskManager = new TaskManager(this._memory, null, this._config.taskManager); // Focus will be added after initialization
    this._parser = new NarseseParser();
    this._eventBus = new EventBus();

    // Initialize focus (needs to be after task manager due to dependencies)
    this._focus = {
      addTaskToFocus: (task, priority) => {
        // Placeholder - will be enhanced when Focus class is implemented
        //console.log(`Adding task to focus: ${task.term.toString()} (priority: ${priority})`);
      },
      getStats: () => ({ focusSets: 0, totalTasks: 0 })
    };

    // Update task manager with focus reference
    this._taskManager = new TaskManager(this._memory, this._focus, this._config.taskManager);

    // Initialize rule engine (placeholder for now)
    this._ruleEngine = {
      getApplicableRules: () => [],
      applyRule: () => []
    };

    // Initialize cycle
    this._cycle = new Cycle({
      memory: this._memory,
      focus: this._focus,
      ruleEngine: this._ruleEngine,
      taskManager: this._taskManager,
      config: this._config.cycle
    });

    // System state
    this._isRunning = false;
    this._cycleInterval = null;

    // Register default event handlers
    this._setupDefaultEventHandlers();
  }

  // Getters
  get config() { return this._config; }
  get memory() { return this._memory; }
  get isRunning() { return this._isRunning; }
  get cycleCount() { return this._cycle.cycleCount; }

  async input(narseseString) {
    try {
      // Parse the input
      const parsed = this._parser.parse(narseseString);

      // Create task based on parsed input
      const task = {
        BELIEF: () => this._taskManager.createBelief(parsed.term, parsed.truthValue, this._calculateInputPriority(parsed)),
        GOAL: () => this._taskManager.createGoal(parsed.term, parsed.truthValue, this._calculateInputPriority(parsed)),
        QUESTION: () => this._taskManager.createQuestion(parsed.term, this._calculateInputPriority(parsed))
      }[parsed.taskType]?.() ?? (() => { throw new Error(`Unknown task type: ${parsed.taskType}`); })();

      // Add task to system
      const added = this._taskManager.addTask(task);

      if (added) {
        // Emit input event
        this._eventBus.emit('task.input', {
          task,
          source: 'user',
          originalInput: narseseString,
          parsed
        });

        // Process pending tasks immediately (whether system is running or not)
        await this._processPendingTasks();
      }

      return added;

    } catch (error) {
      this._eventBus.emit('input.error', {
        error: error.message,
        input: narseseString
      });
      throw error;
    }
  }

  start() {
    if (this._isRunning) {
      return false;
    }

    this._isRunning = true;

    // Process any existing pending tasks
    this._processPendingTasks();

    // Start continuous cycle execution
    this._cycleInterval = setInterval(async () => {
      try {
        await this._executeCycle();
      } catch (error) {
        console.error('Error in reasoning cycle:', error);
        this._eventBus.emit('cycle.error', { error: error.message });
      }
    }, this._config.cycle.delay);

    this._eventBus.emit('system.started', { timestamp: Date.now() });
    return true;
  }

  /**
   * Stop continuous reasoning cycles
   * @returns {boolean} - True if stopped successfully
   */
  stop() {
    if (!this._isRunning) {
      return false;
    }

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
      // Process pending tasks first
      await this._processPendingTasks();

      // Execute one cycle
      const result = await this._cycle.execute();

      this._eventBus.emit('cycle.completed', result);

      return result;

    } catch (error) {
      this._eventBus.emit('cycle.error', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute multiple reasoning cycles
   * @param {number} count - Number of cycles to execute
   * @returns {Array<Object>} - Results from each cycle
   */
  async runCycles(count) {
    const results = [];

    for (let i = 0; i < count; i++) {
      try {
        const result = await this.step();
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, cycleNumber: i + 1 });
      }
    }

    return results;
  }

  /**
   * Query the system for beliefs matching a pattern
   * @param {Term} queryTerm - Term to query for
   * @returns {Array<Task>} - Matching belief tasks
   */
  query(queryTerm) {
    const concept = this._memory.getConcept(queryTerm);
    if (!concept) {
      return [];
    }

    return concept.getTasksByType('BELIEF');
  }

  /**
   * Get all current beliefs in the system
   * @param {Term} queryTerm - Optional term to filter by
   * @returns {Array<Task>} - Belief tasks
   */
  getBeliefs(queryTerm = null) {
    if (queryTerm) {
      return this.query(queryTerm);
    }

    const allBeliefs = [];
    for (const concept of this._memory.getAllConcepts()) {
      allBeliefs.push(...concept.getTasksByType('BELIEF'));
    }

    return allBeliefs;
  }

  /**
   * Get all current goals in the system
   * @returns {Array<Task>} - Goal tasks
   */
  getGoals() {
    return this._taskManager.findTasksByType('GOAL');
  }

  /**
   * Get all current questions in the system
   * @returns {Array<Task>} - Question tasks
   */
  getQuestions() {
    return this._taskManager.findTasksByType('QUESTION');
  }

  /**
   * Reset the system to initial state
   */
  reset() {
    this.stop();

    this._memory.clear();
    this._taskManager.clearPendingTasks();
    this._cycle.reset();

    this._eventBus.emit('system.reset', { timestamp: Date.now() });
  }

  /**
   * Register event listener
   * @param {string} eventName - Name of event to listen for
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    this._eventBus.on(eventName, callback);
  }

  /**
   * Unregister event listener
   * @param {string} eventName - Name of event to stop listening for
   * @param {Function} callback - Callback function to remove
   */
  off(eventName, callback) {
    this._eventBus.off(eventName, callback);
  }

  /**
   * Get system statistics
   * @returns {Object} - System statistics
   */
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

    parsed.truthValue?.confidence &&
      (priority = Math.min(1.0, priority + parsed.truthValue.confidence * 0.3));

    priority = Math.min(1.0, priority + { GOAL: 0.2, QUESTION: 0.1 }[parsed.taskType] || 0);

    return priority;
  }

  /**
   * Process pending tasks
   */
  async _processPendingTasks() {
    const processedTasks = this._taskManager.processPendingTasks(Date.now());

    for (const task of processedTasks) {
      this._eventBus.emit('task.added', { task });
    }
  }

  /**
   * Execute a single cycle
   */
  async _executeCycle() {
    const result = await this._cycle.execute();
    this._eventBus.emit('cycle.completed', result);
  }

  /**
   * Setup default event handlers
   */
  _setupDefaultEventHandlers() {
    // Log significant events
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