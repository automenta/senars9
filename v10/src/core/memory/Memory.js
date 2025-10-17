import { Concept } from './Concept.js';

export class Memory {
 constructor(config) {
   this._config = config;
   this._concepts = new Map();
   this._focusConcepts = new Set();
   this._stats = {
     totalConcepts: 0,
     totalTasks: 0,
     focusConceptsCount: 0,
     createdAt: Date.now(),
     lastConsolidation: Date.now()
   };
   this._cyclesSinceConsolidation = 0;
 }

 get concepts() { return new Map(this._concepts); }
 get focusConcepts() { return new Set(this._focusConcepts); }
 get stats() { return { ...this._stats }; }
 get config() { return this._config; }

  addTask(task, currentTime = Date.now()) {
    if (!task || !task.term) return false;
    const term = task.term;

    let concept = this._concepts.get(term);
    if (!concept) {
      concept = new Concept(term, this._config);
      this._concepts.set(term, concept);
      this._stats.totalConcepts++;
    }

    const added = concept.addTask(task);
    if (added) {
      this._stats.totalTasks++;
      task.priority >= this._config.priorityThreshold && (
        this._focusConcepts.add(concept),
        this._stats.focusConceptsCount = this._focusConcepts.size
      );
    }
    return added;
  }

  getConcept(term) {
    if (!term) return null;
    let concept = this._concepts.get(term);
    if (concept) return concept;

    for (let [key, value] of this._concepts) {
      if (key.equals(term)) return value;
    }
    return null;
  }

  /**
   * Get all concepts in the system
   * @returns {Array<Concept>} - Array of all concepts
   */
  getAllConcepts() {
    return Array.from(this._concepts.values());
  }

  /**
   * Get concepts that match a pattern or have high activation
   * @param {Object} criteria - Search criteria
   * @returns {Array<Concept>} - Matching concepts
   */
  getConceptsByCriteria(criteria = {}) {
    let concepts = this.getAllConcepts();

    if (criteria.minActivation !== undefined) {
      concepts = concepts.filter(c => c.activation >= criteria.minActivation);
    }

    if (criteria.minTasks !== undefined) {
      concepts = concepts.filter(c => c.totalTasks >= criteria.minTasks);
    }

    if (criteria.taskType) {
      concepts = concepts.filter(c => c.getTasksByType(criteria.taskType).length > 0);
    }

    if (criteria.onlyFocus && criteria.onlyFocus === true) {
      concepts = concepts.filter(c => this._focusConcepts.has(c));
    }

    return concepts;
  }

  /**
   * Get the most active concepts for reasoning
   * @param {number} limit - Maximum number of concepts to return
   * @returns {Array<Concept>} - Most active concepts
   */
  getMostActiveConcepts(limit = 10) {
    const allConcepts = this.getAllConcepts();

    // Sort by activation, use count, and task count
    const scoredConcepts = allConcepts.map(concept => ({
      concept,
      score: concept.activation * 0.5 +
             Math.min(concept.useCount / 100, 1) * 0.3 +
             Math.min(concept.totalTasks / 50, 1) * 0.2
    }));

    scoredConcepts.sort((a, b) => b.score - a.score);

    return scoredConcepts.slice(0, limit).map(item => item.concept);
  }

  /**
   * Remove a concept from memory (forgetting)
   * @param {Term} term - Term of the concept to remove
   * @returns {boolean} - True if concept was found and removed
   */
  removeConcept(term) {
    const concept = this._concepts.get(term);
    if (!concept) return false;

    // Remove from focus memory if present
    if (this._focusConcepts.has(concept)) {
      this._focusConcepts.delete(concept);
      this._stats.focusConceptsCount = this._focusConcepts.size;
    }

    // Remove from long-term memory
    this._concepts.delete(term);
    this._stats.totalConcepts--;

    // Update task count
    this._stats.totalTasks -= concept.totalTasks;

    return true;
  }

  /**
   * Consolidate memory: move tasks between focus and long-term memory
   * @param {number} currentTime - Current timestamp
   */
  consolidate(currentTime = Date.now()) {
    const consolidationInterval = this._config.consolidationInterval;

    // Check if it's time for consolidation
    if (this._cyclesSinceConsolidation < consolidationInterval) {
      this._cyclesSinceConsolidation++;
      return;
    }

    this._cyclesSinceConsolidation = 0;
    this._stats.lastConsolidation = currentTime;

    // Process focus concepts for potential promotion to long-term
    for (const concept of this._focusConcepts) {
      // Promote high-priority tasks to long-term memory
      const highPriorityTasks = concept.getAllTasks().filter(task =>
        task.priority >= this._config.priorityThreshold
      );

      // Tasks are already in long-term memory, just update their status
      // In a more sophisticated implementation, we might move them to different storage

      // Demote low-priority concepts from focus
      if (concept.activation < 0.1 && concept.totalTasks < 5) {
        this._focusConcepts.delete(concept);
      }
    }

    // Apply decay to all concepts
    this._applyGlobalDecay();

    // Remove concepts that have decayed too much
    this._removeDecayedConcepts();

    this._stats.focusConceptsCount = this._focusConcepts.size;
  }

  /**
   * Apply decay to concept activations and task priorities
   */
  _applyGlobalDecay() {
    const decayRate = this._config.priorityDecayRate;

    for (const concept of this._concepts.values()) {
      concept.applyDecay(decayRate);

      // Update concept activation based on task priorities
      const avgPriority = concept.averagePriority;
      concept._activation = Math.max(concept._activation * 0.9, avgPriority * 0.5);
    }
  }

  /**
   * Remove concepts that have decayed below threshold
   */
  _removeDecayedConcepts() {
    const conceptsToRemove = [];

    for (const [term, concept] of this._concepts) {
      // Remove concepts with very low activation and few tasks
      if (concept.activation < 0.01 && concept.totalTasks < 2) {
        conceptsToRemove.push(term);
      }
    }

    for (const term of conceptsToRemove) {
      this.removeConcept(term);
    }
  }

  /**
   * Update concept activation when used
   * @param {Term} term - Term of concept to boost
   * @param {number} boostAmount - Amount to boost activation
   */
  boostConceptActivation(term, boostAmount = 0.1) {
    const concept = this._concepts.get(term);
    if (concept) {
      concept.boostActivation(boostAmount);

      // Ensure concept is in focus memory
      if (!this._focusConcepts.has(concept)) {
        this._focusConcepts.add(concept);
        this._stats.focusConceptsCount = this._focusConcepts.size;
      }
    }
  }

  /**
   * Update concept quality based on inference success
   * @param {Term} term - Term of concept to update
   * @param {number} qualityChange - Change in quality
   */
  updateConceptQuality(term, qualityChange) {
    const concept = this._concepts.get(term);
    if (concept) {
      concept.updateQuality(qualityChange);
    }
  }

  /**
   * Get memory statistics for monitoring
   * @returns {Object} - Detailed statistics
   */
  getDetailedStats() {
    const conceptStats = this.getAllConcepts().map(c => c.getStats());
    const oldestConcept = conceptStats.length > 0 ? Math.min(...conceptStats.map(s => s.createdAt)) : null;
    const newestConcept = conceptStats.length > 0 ? Math.max(...conceptStats.map(s => s.createdAt)) : null;


    return {
      ...this._stats,
      conceptStats,
      memoryUsage: {
        concepts: this._concepts.size,
        focusConcepts: this._focusConcepts.size,
        totalTasks: this._stats.totalTasks
      },
      oldestConcept,
      newestConcept,
      averageActivation: conceptStats.length > 0 ?
        conceptStats.reduce((sum, s) => sum + s.activation, 0) / conceptStats.length : 0,
      averageQuality: conceptStats.length > 0 ?
        conceptStats.reduce((sum, s) => sum + s.quality, 0) / conceptStats.length : 0
    };
  }

  /**
   * Clear all memory
   */
  clear() {
    this._concepts.clear();
    this._focusConcepts.clear();
    this._stats = {
      totalConcepts: 0,
      totalTasks: 0,
      focusConceptsCount: 0,
      createdAt: Date.now(),
      lastConsolidation: Date.now()
    };
    this._cyclesSinceConsolidation = 0;
  }

  /**
   * Check if memory contains a concept for the given term
   * @param {Term} term - Term to check
   * @returns {boolean} - True if concept exists
   */
  hasConcept(term) {
    return this._concepts.has(term);
  }

  /**
   * Get total number of tasks in memory
   * @returns {number} - Total task count
   */
  getTotalTaskCount() {
    return this._stats.totalTasks;
  }

  /**
   * Get concepts with beliefs matching a pattern
   * @param {Term} pattern - Pattern to match against
   * @returns {Array<Concept>} - Concepts with matching beliefs
   */
  getConceptsWithBeliefs(pattern) {
    return this.getAllConcepts().filter(concept => {
      const beliefs = concept.getTasksByType('BELIEF');
      return beliefs.some(task => this._termsMatch(task.term, pattern));
    });
  }

  /**
   * Simple term matching (placeholder for more sophisticated matching)
   * @param {Term} term1 - First term
   * @param {Term} term2 - Second term
   * @returns {boolean} - True if terms match
   */
  _termsMatch(term1, term2) {
    // Simple equality for now - would be enhanced with pattern matching
    return term1.equals(term2);
  }
}