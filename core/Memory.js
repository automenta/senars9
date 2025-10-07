/**
 * @file: core/Memory.js
 * @description: Manages the system's knowledge base, including task and term storage, indexing, and caching.
 * @module Memory
 */

import Component from './Component.js';

class Memory extends Component {
  constructor() {
    super();
    this.tasks = new Map(); // Main storage for all tasks
    this.termCache = new Map(); // Cache for frequently accessed terms
    this.queryCache = new Map(); // Cache for query results
  }

  /**
   * Initializes the Memory component.
   * @param {object} config - The configuration object.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.tasks.clear();
    this.termCache.clear();
    this.queryCache.clear();
  }

  /**
   * Stores a task in memory.
   * @param {object} task - The task object to store.
   * @returns {Promise<void>}
   */
  async storeTask(task) {
    if (!task || !task.id) {
      throw new Error('Task must have an ID to be stored.');
    }
    this.tasks.set(task.id, task);
    this.invalidateQueryCache(); // Invalidate cache on new data
  }

  /**
   * Retrieves a task by its ID.
   * @param {string} taskId - The ID of the task to retrieve.
   * @returns {Promise<object|undefined>} The task object or undefined if not found.
   */
  async retrieveTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Updates an existing task.
   * @param {string} taskId - The ID of the task to update.
   * @param {object} updates - An object with the properties to update.
   * @returns {Promise<void>}
   */
  async updateTask(taskId, updates) {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task with ID "${taskId}" not found.`);
    }
    const task = this.tasks.get(taskId);
    Object.assign(task, updates);
    this.tasks.set(taskId, task);
    this.invalidateQueryCache();
  }

  /**
   * Deletes a task from memory.
   * @param {string} taskId - The ID of the task to delete.
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    this.tasks.delete(taskId);
    this.invalidateQueryCache();
  }

  /**
   * Queries tasks based on a set of criteria.
   * (This is a simplified query method; a real implementation would be more complex).
   * @param {object} query - The query object.
   * @returns {Promise<Array<object>>} A list of tasks matching the query.
   */
  async queryTasks(query) {
    const queryKey = JSON.stringify(query);
    if (this.queryCache.has(queryKey)) {
      return this.queryCache.get(queryKey);
    }

    const results = [];
    for (const task of this.tasks.values()) {
      let match = true;
      for (const key in query) {
        if (task[key] !== query[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        results.push(task);
      }
    }

    this.queryCache.set(queryKey, results);
    return results;
  }

  /**
   * Clears the query cache.
   */
  invalidateQueryCache() {
    this.queryCache.clear();
  }

  /**
   * Retrieves memory usage statistics.
   * @returns {object}
   */
  getMetrics() {
    return {
      totalTasks: this.tasks.size,
      termCacheSize: this.termCache.size,
      queryCacheSize: this.queryCache.size,
    };
  }
}

export default Memory;