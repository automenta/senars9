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
   * @param {number} config.cycleInterval - Interval for continuous reasoning (ms)
   * @param {number} config.focusSize - Maximum number of tasks in focus set
   * @param {number} config.priorityThreshold - Minimum priority threshold for tasks to be considered
   */
  constructor(config = {}) {
    // Core NARS components
    this.memory = new Memory();
    this.reasoner = new Reasoner();
    this.focusSetSelector = new FocusSetSelector(
      config.focusSize || 5,
      config.priorityThreshold || 0.1,
      config.urgencyWeight || 0.2,
      config.diversityFactor || 0.1
    );
    
    // System state
    this.config = config;
    this._isRunning = false;
    this.cycleInterval = config.cycleInterval || 100; // ms
    this.cycleTimer = null;
    
    // Stats
    this.stats = {
      cycles: 0,
      inputTasks: 0,
      derivedTasks: 0,
      birthdate: null
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
        let term, punctuation;
        if (taskData.endsWith('!')) {
          punctuation = Punctuation.GOAL;
          term = taskData.slice(0, -1);
        } else if (taskData.endsWith('?')) {
          punctuation = Punctuation.QUESTION;
          term = taskData.slice(0, -1);
        } else {
          punctuation = Punctuation.BELIEF;
          term = taskData.endsWith('.') ? taskData.slice(0, -1) : taskData;
        }
        
        term = term.trim();
        
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
   * Get beliefs from memory
   * @returns {Array} - Array of belief tasks
   */
  getBeliefs() {
    return this.memory.getAllTasks().filter(task => task.isBelief());
  }

  /**
   * Get goals from memory
   * @returns {Array} - Array of goal tasks
   */
  getGoals() {
    return this.memory.getAllTasks().filter(task => task.isGoal());
  }

  /**
   * Get questions from memory
   * @returns {Array} - Array of question tasks
   */
  getQuestions() {
    return this.memory.getAllTasks().filter(task => task.isQuestion());
  }

  /**
   * Find tasks matching a specific term pattern
   * @param {string} termPattern - Pattern to match in task terms
   * @returns {Array} - Array of matching tasks
   */
  findTasksByTerm(termPattern) {
    return this.memory.getAllTasks().filter(task => {
      return task.term && task.term.name && task.term.name.includes(termPattern);
    });
  }

  /**
   * Get task by its hash (unique identifier)
   * @param {string} taskHash - The hash of the task to retrieve
   * @returns {Task|null} - The task if found, null otherwise
   */
  getTaskByHash(taskHash) {
    return this.memory.getTask(taskHash);
  }

  /**
   * Remove a task from memory
   * @param {string} taskHash - The hash of the task to remove
   * @returns {boolean} - True if task was removed, false if not found
   */
  removeTask(taskHash) {
    return this.memory.removeTask(taskHash);
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
    if (this._isRunning) {
      Logger.warn('NAR is already running');
      return;
    }
    
    this._isRunning = true;
    this.stats.birthdate = Date.now();
    
    const runCycle = () => {
      if (this._isRunning) {
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
    if (!this._isRunning) {
      Logger.warn('NAR is not running');
      return;
    }
    
    this._isRunning = false;
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
      uptime: this.stats.birthdate ? Date.now() - this.stats.birthdate : 0,
      memoryState: this.getMemoryState()
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
   * Get the highest priority task
   * @returns {Task|null} - The highest priority task, or null if no tasks exist
   */
  getHighestPriorityTask() {
    const tasks = this.getTasksByPriority();
    return tasks.length > 0 ? tasks[0] : null;
  }

  /**
   * Get concepts from memory
   * @returns {Array} - Array of concepts in memory
   */
  getConcepts() {
    return Array.from(this.memory.conceptStorage.values());
  }

  /**
   * Get concept by term
   * @param {string} termName - Name of the concept term
   * @returns {Object|null} - The concept if found, null otherwise
   */
  getConceptByTerm(termName) {
    // Find concept by term hash
    for (const [hash, concept] of this.memory.conceptStorage) {
      if (concept.term && concept.term.name === termName) {
        return concept;
      }
    }
    return null;
  }

  /**
   * Reset the reasoner to initial state
   */
  reset() {
    this.memory = new Memory();
    this.reasoner = new Reasoner(); // Reset reasoner as well
    this.focusSetSelector = new FocusSetSelector( // Reset focus selector
      this.config.focusSize || 5,
      this.config.priorityThreshold || 0.1,
      this.config.urgencyWeight || 0.2,
      this.config.diversityFactor || 0.1
    );
    
    this.stats = {
      cycles: 0,
      inputTasks: 0,
      derivedTasks: 0,
      birthdate: null
    };
    
    Logger.debug('NAR reset to initial state');
  }
  
  /**
   * Check if the NAR is currently running
   * @returns {boolean} - True if running, false otherwise
   */
  isRunning() {
    return this.isRunning;
  }
}