/**
 * Concept class - Represents a concept in memory, holds related tasks
 * Implements knowledge organization as specified in DESIGN.md
 */

import { Bag } from './Bag.js';

export class Concept {
  constructor(term, config = {}) {
    this._term = term;
    this._createdAt = Date.now();
    this._lastAccessed = Date.now();

    // Task storage by type
    this._beliefs = new Bag(config.maxBeliefs || 100);
    this._goals = new Bag(config.maxGoals || 50);
    this._questions = new Bag(config.maxQuestions || 20);

    // Concept metadata
    this._activation = 0.5; // Base activation level
    this._useCount = 0; // How many times this concept has been used
    this._quality = 0.5; // Quality measure based on successful inferences

    // Note: Not freezing to allow internal property updates for performance
  }

  // Getters
  get term() { return this._term; }
  get createdAt() { return this._createdAt; }
  get lastAccessed() { return this._lastAccessed; }
  get activation() { return this._activation; }
  get useCount() { return this._useCount; }
  get quality() { return this._quality; }

  // Task storage getters
  get beliefs() { return this._beliefs; }
  get goals() { return this._goals; }
  get questions() { return this._questions; }

  // Computed properties
  get totalTasks() {
    return this._beliefs.size + this._goals.size + this._questions.size;
  }

  get averagePriority() {
    if (this.totalTasks === 0) return 0;

    const totalPriority = this._beliefs.getAveragePriority() * this._beliefs.size +
                        this._goals.getAveragePriority() * this._goals.size +
                        this._questions.getAveragePriority() * this._questions.size;

    return totalPriority / this.totalTasks;
  }

  /**
   * Add a task to the appropriate storage based on its type
   * @param {Task} task - The task to add
   * @returns {boolean} - True if task was added successfully
   */
  addTask(task) {
    const taskType = task.type;
    let storage;

    switch (taskType) {
      case 'BELIEF':
        storage = this._beliefs;
        break;
      case 'GOAL':
        storage = this._goals;
        break;
      case 'QUESTION':
        storage = this._questions;
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    const added = storage.add(task, task.priority);

    if (added) {
      // Create new concept with updated access time and use count
      this._lastAccessed = Date.now();
      this._useCount++;
    }

    return added;
  }

  /**
   * Get the highest priority task of a specific type
   * @param {string} taskType - Type of task (BELIEF, GOAL, QUESTION)
   * @returns {Task|null} - Highest priority task or null if none found
   */
  getHighestPriorityTask(taskType) {
    switch (taskType) {
      case 'BELIEF':
        return this._beliefs.peek();
      case 'GOAL':
        return this._goals.peek();
      case 'QUESTION':
        return this._questions.peek();
      default:
        return null;
    }
  }

  /**
   * Get all tasks of a specific type in priority order
   * @param {string} taskType - Type of task (BELIEF, GOAL, QUESTION)
   * @returns {Array} - Array of tasks in priority order
   */
  getTasksByType(taskType) {
    switch (taskType) {
      case 'BELIEF':
        return this._beliefs.getItemsInPriorityOrder();
      case 'GOAL':
        return this._goals.getItemsInPriorityOrder();
      case 'QUESTION':
        return this._questions.getItemsInPriorityOrder();
      default:
        return [];
    }
  }

  /**
   * Remove a specific task from the concept
   * @param {Task} task - The task to remove
   * @returns {boolean} - True if task was found and removed
   */
  removeTask(task) {
    const taskType = task.type;
    let storage;

    switch (taskType) {
      case 'BELIEF':
        storage = this._beliefs;
        break;
      case 'GOAL':
        storage = this._goals;
        break;
      case 'QUESTION':
        storage = this._questions;
        break;
      default:
        return false;
    }

    const removed = storage.remove(task);

    if (removed) {
      this._lastAccessed = Date.now();
    }

    return removed;
  }

  /**
   * Update the priority of a specific task
   * @param {Task} task - The task to update
   * @param {number} newPriority - New priority value
   * @returns {boolean} - True if task was found and updated
   */
  updateTaskPriority(task, newPriority) {
    const taskType = task.type;
    let storage;

    switch (taskType) {
      case 'BELIEF':
        storage = this._beliefs;
        break;
      case 'GOAL':
        storage = this._goals;
        break;
      case 'QUESTION':
        storage = this._questions;
        break;
      default:
        return false;
    }

    const updated = storage.updatePriority(task, newPriority);

    if (updated) {
      this._lastAccessed = Date.now();
    }

    return updated;
  }

  /**
   * Apply decay to all task priorities and update concept activation
   * @param {number} decayRate - Rate to decay priorities (0-1)
   */
  applyDecay(decayRate = 0.01) {
    this._beliefs.applyDecay(decayRate);
    this._goals.applyDecay(decayRate);
    this._questions.applyDecay(decayRate);

    // Decay concept activation
    this._activation *= (1 - decayRate);
    this._lastAccessed = Date.now();
  }

  /**
   * Increase concept activation based on usage
   * @param {number} activationBoost - Amount to increase activation
   */
  boostActivation(activationBoost = 0.1) {
    this._activation = Math.min(1.0, this._activation + activationBoost);
    this._lastAccessed = Date.now();
  }

  /**
   * Update concept quality based on inference success
   * @param {number} qualityChange - Change in quality (-1 to 1)
   */
  updateQuality(qualityChange) {
    this._quality = Math.max(0, Math.min(1, this._quality + qualityChange));
  }

  /**
   * Check if concept contains a specific task
   * @param {Task} task - The task to check
   * @returns {boolean} - True if concept contains the task
   */
  containsTask(task) {
    return this._beliefs.contains(task) ||
           this._goals.contains(task) ||
           this._questions.contains(task);
  }

  /**
   * Get all tasks from all storage types in priority order
   * @returns {Array} - Array of all tasks in priority order
   */
  getAllTasks() {
    const allTasks = [
      ...this._beliefs.getItemsInPriorityOrder(),
      ...this._goals.getItemsInPriorityOrder(),
      ...this._questions.getItemsInPriorityOrder()
    ];

    // Sort by priority (highest first)
    return allTasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get concept statistics for monitoring
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      term: this._term.toString(),
      totalTasks: this.totalTasks,
      beliefsCount: this._beliefs.size,
      goalsCount: this._goals.size,
      questionsCount: this._questions.size,
      activation: this._activation,
      useCount: this._useCount,
      quality: this._quality,
      averagePriority: this.averagePriority,
      createdAt: this._createdAt,
      lastAccessed: this._lastAccessed
    };
  }

}