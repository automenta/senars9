import createCore from './createCore.js';
import { Logger } from './utilities.js';

const DEFAULT_PRIORITY = 0.5;
const QUESTION_PRIORITY = 0.7;
const QUESTION_TIMEOUT = 30000;
const BELIEF_PRIORITY = 0.6;
const GOAL_PRIORITY = 0.8;
const DEFAULT_FREQUENCY = 1.0;
const DEFAULT_CONFIDENCE = 0.9;
const VERSION = '2.0.0';

class System {
  constructor(config = {}) {
    this.config = config;
    this.core = null;
    this.isRunning = false;
    this.startTime = null;
    this.taskCount = 0;
    this.eventHandlers = new Map();
  }

  async start() {
    if (this.core) {
      Logger.warn('System is already running.');
      return;
    }

    try {
      this.core = await createCore(this.config);
      await this.core.start();
      this.isRunning = true;
      this.startTime = Date.now();

      // Set up default event handlers
      this._setupDefaultEventHandlers();

      Logger.info('SeNARS system started successfully');
    } catch (error) {
      Logger.error('Failed to start system:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.core) return;

    try {
      await this.core.stop();
      await this.core.destroy();
      this.core = null;
      this.isRunning = false;

      // Clean up event handlers
      this.eventHandlers.clear();

      Logger.info('SeNARS system stopped');
    } catch (error) {
      Logger.error('Error stopping system:', error);
      throw error;
    }
  }

  // Enhanced task input with validation and processing
  input(task) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before inputting tasks.');
    }

    // Validate task format
    if (!task || typeof task !== 'object') {
      throw new Error('Task must be an object');
    }

    if (!task.term || typeof task.term !== 'string') {
      throw new Error('Task must have a valid term');
    }

    const enhancedTask = {
      term: task.term,
      punctuation: task.punctuation || '.',
      truth: task.truth || { frequency: DEFAULT_FREQUENCY, confidence: DEFAULT_CONFIDENCE },
      priority: task.priority || DEFAULT_PRIORITY,
      timestamp: Date.now(),
      accessedAt: Date.now(),
      createdAt: Date.now(),
      ...task
    };

    this.taskCount++;
    this.core.messages.emit('task.input', enhancedTask);

    return enhancedTask;
  }

  // Enhanced event handling with automatic cleanup
  on(event, handler) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before registering event handlers.');
    }

    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    // Wrap handler to track and manage it
    const wrappedHandler = (...args) => {
      try {
        return handler(...args);
      } catch (error) {
        Logger.error(`Error in event handler for '${event}':`, error);
      }
    };

    this.core.messages.on(event, wrappedHandler);
    this.eventHandlers.set(handler, { event, wrappedHandler });

    return this; // For method chaining
  }

  off(event, handler) {
    if (!this.core) {
      return this; // Fail silently if trying to unregister from a stopped system
    }

    const handlerInfo = this.eventHandlers.get(handler);
    if (handlerInfo) {
      this.core.messages.off(handlerInfo.event, handlerInfo.wrappedHandler);
      this.eventHandlers.delete(handler);
    }

    return this; // For method chaining
  }

  // Convenience method for asking questions
  async ask(question, options = {}) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before asking questions.');
    }

    const questionTask = {
      term: question,
      punctuation: '?',
      priority: options.priority || QUESTION_PRIORITY,
      timeout: options.timeout || QUESTION_TIMEOUT
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off('answer', answerHandler);
        reject(new Error('Question timeout'));
      }, questionTask.timeout);

      const answerHandler = (answer) => {
        clearTimeout(timeout);
        this.off('answer', answerHandler);
        resolve(answer);
      };

      this.on('answer', answerHandler);
      this.input(questionTask);
    });
  }

  remember(statement, truth = { frequency: DEFAULT_FREQUENCY, confidence: DEFAULT_CONFIDENCE }) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before remembering statements.');
    }

    const beliefTask = {
      term: statement,
      punctuation: '.',
      truth,
      priority: BELIEF_PRIORITY
    };

    return this.input(beliefTask);
  }

  want(goal, priority = GOAL_PRIORITY) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before setting goals.');
    }

    const goalTask = {
      term: goal,
      punctuation: '!',
      truth: { frequency: DEFAULT_FREQUENCY, confidence: DEFAULT_CONFIDENCE },
      priority
    };

    return this.input(goalTask);
  }

  // Get system health and status
  getHealth() {
    if (!this.core) {
      return { status: 'stopped', uptime: 0, tasksProcessed: 0 };
    }

    const coreHealth = {
      config: this.core.config?.getHealth?.() || { status: 'unknown' },
      messages: this.core.messages?.getHealth?.() || { status: 'unknown' },
      rules: this.core.rules?.getHealth?.() || { status: 'unknown' },
      memory: this.core.memory?.getHealth?.() || { status: 'unknown' },
      reasoning: this.core.reasoning?.getStats?.() || { status: 'unknown' }
    };

    return {
      status: this.isRunning ? 'running' : 'stopped',
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      tasksProcessed: this.taskCount,
      coreHealth,
      eventHandlers: this.eventHandlers.size
    };
  }

  // Get comprehensive system status
  getStatus() {
    const health = this.getHealth();

    return {
      ...health,
      version: VERSION,
      config: this.config,
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage ? {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      } : null
    };
  }

  // Get system metrics for monitoring
  getMetrics() {
    if (!this.core) {
      return {};
    }

    return {
      system: {
        uptime: this.getHealth().uptime,
        tasksProcessed: this.taskCount,
        eventHandlers: this.eventHandlers.size,
        isRunning: this.isRunning
      },
      components: {
        config: this.core.config?.getMetrics?.() || {},
        messages: this.core.messages?.getStats?.() || {},
        rules: this.core.rules?.getStats?.() || {},
        memory: this.core.memory?.getStats?.() || {},
        reasoning: this.core.reasoning?.getStats?.() || {}
      }
    };
  }

  // Execute a command through the system
  async execute(command, data = {}) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before executing commands.');
    }

    try {
      return await this.core.messages.execute(command, data);
    } catch (error) {
      Logger.error(`Error executing command '${command}':`, error);
      throw error;
    }
  }

  // Process a message through the system
  async process(message) {
    if (!this.core) {
      throw new Error('System is not running. Call start() before processing messages.');
    }

    try {
      return await this.core.messages.process(message);
    } catch (error) {
      Logger.error('Error processing message:', error);
      throw error;
    }
  }

  // Set up default event handlers for common system events
  _setupDefaultEventHandlers() {
    // Log important system events
    this.on('task.input', (task) => {
      Logger.debug('Task input:', task.term);
    });

    this.on('reasoning_error', (error) => {
      Logger.error('Reasoning error:', error);
    });

    this.on('memory.full', (info) => {
      Logger.warn('Memory capacity reached:', info);
    });

    // Track task processing
    this.on('task.processed', (result) => {
      this.taskCount++;
    });
  }

  // Clean up all event handlers
  removeAllListeners() {
    for (const [handler, info] of this.eventHandlers) {
      this.off(info.event, handler);
    }
    return this;
  }
}

export default System;