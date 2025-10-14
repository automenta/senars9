/**
 * @file: core/NAR.js
 * @description: Non-Axiomatic Reasoner (NAR) class that wraps essential NARS components
 * Provides a clean, unified API for application development with integrated memory and reasoning
 */

import { Memory } from './Memory.js';
import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';
import { Reasoner } from './Reasoner.js';
import { CycleContext, runSingleCycle } from './Cycle.js';
import { FocusSetSelector } from './FocusSetSelector.js';
import { Logger } from './base/utilities.js';

export class NAR {
  /**
   * Creates a new Non-Axiomatic Reasoner instance
   * @param {Object} config - Configuration for the reasoner
   */
  constructor(config = {}) {
    // Core NARS components
    this.memory = new Memory();
    this.reasoner = new Reasoner();
    this.focusSetSelector = new FocusSetSelector();
    
    // System state
    this.config = config;
    this.isRunning = false;
    this.cycleInterval = config.cycleInterval || 100; // ms
    this.cycleTimer = null;
    
    // Stats
    this.stats = {
      cycles: 0,
      inputTasks: 0,
      derivedTasks: 0,
      startTime: null
    };
    
    Logger.debug('NAR initialized with integrated memory and reasoning components');
  }

  /**
   * Input a task to the reasoner
   * @param {Object|string} taskData - Task object or string representation
   * @param {string} taskData.term - The term of the task
   * @param {string} taskData.punctuation - '.', '!', or '?' for belief, goal, question
   * @param {Object} taskData.truth - {frequency, confidence} truth values
   * @param {number} taskData.priority - Priority of the task (0.0-1.0)
   */
  input(taskData) {
    try {
      let task;
      
      // If taskData is a string, parse it
      if (typeof taskData === 'string') {
        // Simple parsing for now - in a full system, use proper parser
        const punctuation = taskData.endsWith('!') ? Punctuation.GOAL : 
                           taskData.endsWith('?') ? Punctuation.QUESTION : 
                           Punctuation.BELIEF;
        const term = taskData.slice(0, -1) || taskData; // Remove punctuation
        
        task = Task.createInput(
          Term.newAtom(term),
          punctuation,
          new TruthValue(0.9, 0.9), // default truth
          Date.now(),
          Date.now()
        );
      } else {
        // Create from object
        task = Task.createInput(
          typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term,
          taskData.punctuation || Punctuation.BELIEF,
          taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : 
                         new TruthValue(0.9, 0.9),
          Date.now(),
          Date.now(),
          taskData.priority || 0.5
        );
      }
      
      // Add to memory
      this.memory.addTask(task, Date.now());
      this.stats.inputTasks++;
      
      Logger.debug(`Task input: ${task.toString()}`);
      return task;
    } catch (error) {
      Logger.error('Error inputting task:', error);
      throw error;
    }
  }

  /**
   * Ask a question to the reasoner
   * @param {string|Object} questionData - Question term or task object
   * @returns {Promise} - Promise that resolves with answers
   */
  ask(questionData) {
    // Input the question as a task with question punctuation
    const questionTask = typeof questionData === 'string' ? 
      { term: questionData, punctuation: Punctuation.QUESTION } : 
      { ...questionData, punctuation: Punctuation.QUESTION };
    
    return this.input(questionTask);
  }

  /**
   * Get all tasks from memory
   * @returns {Array} - Array of all tasks in memory
   */
  getTasks() {
    return this.memory.getAllTasks();
  }

  /**
   * Get tasks sorted by priority
   * @returns {Array} - Array of tasks sorted by priority (highest first)
   */
  getTasksByPriority() {
    return this.memory.getAllTasks().sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Get tasks sorted by creation time
   * @returns {Array} - Array of tasks sorted by creation time (newest first)
   */
  getTasksByTime() {
    return this.memory.getAllTasks().sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Run a single cognitive cycle
   */
  runCycle() {
    const context = new CycleContext(Date.now());
    
    // Select focus set from all tasks in memory
    const allTasks = this.memory.getAllTasks();
    if (allTasks.length === 0) return;
    
    const focusSet = this.focusSetSelector.select(allTasks, context.currentTime);
    if (focusSet.length === 0) return;
    
    // Update accessed time for focused tasks
    focusSet.forEach(task => task.setAccessedAt(context.currentTime));
    
    // Run reasoning on focus set
    const derivedTasks = this.reasoner.reason(focusSet, this.memory, context);
    
    // Add derived tasks to memory
    derivedTasks.forEach(task => {
      this.memory.addTask(task, context.currentTime);
      this.stats.derivedTasks++;
    });
    
    // Consolidate memory
    this.memory.consolidate(context.currentTime);
    
    // Update stats
    this.stats.cycles++;
  }

  /**
   * Start the continuous reasoning cycle
   */
  start() {
    if (this.isRunning) {
      Logger.warn('NAR is already running');
      return;
    }
    
    this.isRunning = true;
    this.stats.startTime = Date.now();
    
    const runCycle = () => {
      if (this.isRunning) {
        try {
          this.runCycle();
        } catch (error) {
          Logger.error('Error in reasoning cycle:', error);
        }
        this.cycleTimer = setTimeout(runCycle, this.cycleInterval);
      }
    };
    
    runCycle(); // Start immediately
    Logger.debug('NAR started continuous reasoning cycle');
  }

  /**
   * Stop the continuous reasoning cycle
   */
  stop() {
    if (!this.isRunning) {
      Logger.warn('NAR is not running');
      return;
    }
    
    this.isRunning = false;
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
    
    Logger.debug('NAR stopped continuous reasoning cycle');
  }

  /**
   * Get system statistics
   * @returns {Object} - System statistics
   */
  getStats() {
    return {
      ...this.stats,
      taskCount: this.memory.getAllTasks().length,
      conceptCount: this.memory.conceptStorage.size,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0
    };
  }

  /**
   * Get the current memory state
   * @returns {Object} - Memory statistics and content summary
   */
  getMemoryState() {
    const allTasks = this.memory.getAllTasks();
    const beliefs = allTasks.filter(t => t.punctuation === Punctuation.BELIEF);
    const goals = allTasks.filter(t => t.punctuation === Punctuation.GOAL);
    const questions = allTasks.filter(t => t.punctuation === Punctuation.QUESTION);
    
    return {
      totalTasks: allTasks.length,
      beliefs: beliefs.length,
      goals: goals.length,
      questions: questions.length,
      concepts: this.memory.conceptStorage.size,
      shortTermTasks: this.memory.shortTermTasks.size,
      longTermTasks: this.memory.longTermTasks.size
    };
  }

  /**
   * Reset the reasoner to initial state
   */
  reset() {
    this.memory = new Memory();
    this.stats = {
      cycles: 0,
      inputTasks: 0,
      derivedTasks: 0,
      startTime: null
    };
    
    Logger.debug('NAR reset to initial state');
  }
}