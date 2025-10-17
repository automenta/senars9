import { Bag } from './Bag.js';

export class Concept {
 constructor(term, config = {}) {
   this._term = term;
   this._createdAt = Date.now();
   this._lastAccessed = Date.now();
   this._beliefs = new Bag(config.maxBeliefs || 100);
   this._goals = new Bag(config.maxGoals || 50);
   this._questions = new Bag(config.maxQuestions || 20);
   this._activation = 0;
   this._useCount = 0;
   this._quality = 0;
 }

 get term() { return this._term; }
 get createdAt() { return this._createdAt; }
 get lastAccessed() { return this._lastAccessed; }
 get activation() { return this._activation; }
 get useCount() { return this._useCount; }
 get quality() { return this._quality; }
 get beliefs() { return this._beliefs; }
 get goals() { return this._goals; }
 get questions() { return this._questions; }

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

  _getStorage(taskType) {
    switch (taskType) {
      case 'BELIEF': return this._beliefs;
      case 'GOAL': return this._goals;
      case 'QUESTION': return this._questions;
      default: throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  addTask(task) {
    const storage = this._getStorage(task.type);
    const added = storage.add(task, task.priority);
    if (added) {
      this._lastAccessed = Date.now();
      this._useCount++;
    }
    return added;
  }

  getHighestPriorityTask(taskType) {
    try {
      return this._getStorage(taskType).peek();
    } catch {
      return null;
    }
  }

  getTasksByType(taskType) {
    try {
      return this._getStorage(taskType).getItemsInPriorityOrder();
    } catch {
      return [];
    }
  }

  removeTask(task) {
    try {
      const removed = this._getStorage(task.type).remove(task);
      if (removed) this._lastAccessed = Date.now();
      return removed;
    } catch {
      return false;
    }
  }

  updateTaskPriority(task, newPriority) {
    try {
      const updated = this._getStorage(task.type).updatePriority(task, newPriority);
      if (updated) this._lastAccessed = Date.now();
      return updated;
    } catch {
      return false;
    }
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
    this.incrementUseCount();
  }

  incrementUseCount() {
    this._useCount++;
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