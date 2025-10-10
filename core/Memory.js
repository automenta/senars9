import { Logger } from './base/utilities.js';
import { Concept } from './Concept.js';
import { DEFAULTS } from './base/constants.js';

/**
 * IndexManager handles all content-based and temporal indexes for tasks in memory.
 */
class IndexManager {
  constructor() {
    // Index for implication relationships: premise_hash -> Set of task hashes
    this.implicationIndex = new Map();
    
    // Index for inheritance relationships: subject_hash -> Set of task hashes
    this.inheritanceIndexBySubject = new Map();
    
    // Index for inheritance relationships: predicate_hash -> Set of task hashes
    this.inheritanceIndexByPredicate = new Map();
    
    // Index for similarity relationships: term_hash -> Set of task hashes
    this.similarityIndex = new Map();
    
    // Index for operation relationships: subject_hash -> Set of task hashes
    this.operationIndex = new Map();
    
    // Time-based index: time_range -> Set of task hashes
    this.timeIndex = new Map();
  }

  /**
   * Adds a task to all relevant indexes.
   * @param {Task} task - The task to index
   */
  addTask(task) {
    const term = task.term;
    const taskHash = term.hash;
    
    // Add to time index
    const timeKey = Math.floor(task.occurrenceTime / 1000); // Group by second
    if (!this.timeIndex.has(timeKey)) {
      this.timeIndex.set(timeKey, new Set());
    }
    this.timeIndex.get(timeKey).add(taskHash);
    
    // Add to relationship-specific indexes based on term type
    switch (term.termType) {
      case 'implication':
        if (term.subject) {
          this._addToIndex(this.implicationIndex, term.subject.hash, taskHash);
        }
        break;
      case 'inheritance':
        if (term.subject) {
          this._addToIndex(this.inheritanceIndexBySubject, term.subject.hash, taskHash);
        }
        if (term.predicate) {
          this._addToIndex(this.inheritanceIndexByPredicate, term.predicate.hash, taskHash);
        }
        break;
      case 'similarity':
        if (term.subject) {
          this._addToIndex(this.similarityIndex, term.subject.hash, taskHash);
        }
        if (term.predicate) {
          this._addToIndex(this.similarityIndex, term.predicate.hash, taskHash);
        }
        break;
      case 'operation':
        if (term.subject) {
          this._addToIndex(this.operationIndex, term.subject.hash, taskHash);
        }
        break;
    }
  }

  /**
   * Removes a task from all relevant indexes.
   * @param {Task} task - The task to remove from indexes
   */
  removeTask(task) {
    const term = task.term;
    const taskHash = term.hash;
    
    // Remove from time index
    const timeKey = Math.floor(task.occurrenceTime / 1000);
    if (this.timeIndex.has(timeKey)) {
      this.timeIndex.get(timeKey).delete(taskHash);
    }
    
    // Remove from relationship-specific indexes
    switch (term.termType) {
      case 'implication':
        if (term.subject) {
          this._removeFromIndex(this.implicationIndex, term.subject.hash, taskHash);
        }
        break;
      case 'inheritance':
        if (term.subject) {
          this._removeFromIndex(this.inheritanceIndexBySubject, term.subject.hash, taskHash);
        }
        if (term.predicate) {
          this._removeFromIndex(this.inheritanceIndexByPredicate, term.predicate.hash, taskHash);
        }
        break;
      case 'similarity':
        if (term.subject) {
          this._removeFromIndex(this.similarityIndex, term.subject.hash, taskHash);
        }
        if (term.predicate) {
          this._removeFromIndex(this.similarityIndex, term.predicate.hash, taskHash);
        }
        break;
      case 'operation':
        if (term.subject) {
          this._removeFromIndex(this.operationIndex, term.subject.hash, taskHash);
        }
        break;
    }
  }

  /**
   * Helper to add to an index map.
   * @private
   */
  _addToIndex(index, key, value) {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key).add(value);
  }

  /**
   * Helper to remove from an index map.
   * @private
   */
  _removeFromIndex(index, key, value) {
    if (index.has(key)) {
      index.get(key).delete(value);
      // Clean up empty sets
      if (index.get(key).size === 0) {
        index.delete(key);
      }
    }
  }

  /**
   * Gets implication hashes by premise hash.
   * @param {string} premiseHash - The hash of the premise term
   * @returns {Set|null} Set of task hashes or null if none found
   */
  getImplicationHashesByPremise(premiseHash) {
    return this.implicationIndex.get(premiseHash) || null;
  }

  /**
   * Gets inheritance hashes by predicate hash.
   * @param {string} predicateHash - The hash of the predicate term
   * @returns {Set|null} Set of task hashes or null if none found
   */
  getInheritanceHashesByPredicate(predicateHash) {
    return this.inheritanceIndexByPredicate.get(predicateHash) || null;
  }

  /**
   * Gets inheritance hashes by subject hash.
   * @param {string} subjectHash - The hash of the subject term
   * @returns {Set|null} Set of task hashes or null if none found
   */
  getInheritanceHashesBySubject(subjectHash) {
    return this.inheritanceIndexBySubject.get(subjectHash) || null;
  }

  /**
   * Gets similarity hashes by term hash.
   * @param {string} termHash - The hash of the term
   * @returns {Set|null} Set of task hashes or null if none found
   */
  getSimilarityHashes(termHash) {
    return this.similarityIndex.get(termHash) || null;
  }

  /**
   * Gets task hashes within a specific time range.
   * @param {number} startTime - Start time (seconds)
   * @param {number} endTime - End time (seconds)
   * @returns {string[]} Array of task hashes
   */
  getTaskHashesByTimeRange(startTime, endTime) {
    const result = new Set();
    const startKey = Math.floor(startTime / 1000);
    const endKey = Math.floor(endTime / 1000);

    for (let key = startKey; key <= endKey; key++) {
      const hashes = this.timeIndex.get(key);
      if (hashes) {
        for (const hash of hashes) {
          result.add(hash);
        }
      }
    }
    return Array.from(result);
  }
}

/**
 * Represents the memory of the SeNARS system, storing knowledge and active tasks.
 * 
 * The memory is designed with a dual storage architecture (short-term and long-term)
 * and uses indexes for efficient, content-addressable retrieval of information. 
 * It is also responsible for the lifecycle of all Concept instances, ensuring that 
 * each unique term is represented by a single, canonical concept object.
 */
export class Memory {
  constructor() {
    // Storage for all unique concepts in the system, ensuring each term has a single instance
    this.conceptStorage = new Map(); // key: term hash, value: Concept
    // Short-term memory for recently added or accessed tasks
    this.shortTermTasks = new Map(); // key: term hash, value: Task
    // Long-term memory for consolidated, important knowledge
    this.longTermTasks = new Map(); // key: term hash, value: Task

    // The index manager handles all task indexing
    this.indexManager = new IndexManager();

    // Statistics
    this.totalTasks = 0;
    this.consolidationCount = 0;
    this.lastConsolidation = 0;
  }

  /**
   * Adds a new task to short-term memory, creating its concept if necessary,
   * and updates all relevant indexes via the IndexManager.
   * @param {Task} task - The task to add
   * @param {number} currentTime - The current timestamp
   */
  addTask(task, currentTime) {
    // First, ensure concepts for the task's term and all its sub-terms exist
    this._ensureConceptExistsRecursive(task.term, currentTime);

    const termHash = task.term.hash;

    // Add to task storage and update count if it's a new task
    if (!this.shortTermTasks.has(termHash)) {
      this.totalTasks++;
    }
    
    this.shortTermTasks.set(termHash, task);

    // Also add the task to the associated concept's appropriate task table
    const concept = this.conceptStorage.get(termHash);
    if (concept) {
      concept.addTask(task);
    }

    // Delegate indexing to the IndexManager
    this.indexManager.addTask(task);
  }

  /**
   * Retrieves a task from memory by its term hash.
   * @param {string} termHash - The hash of the term to look up
   * @returns {Task|null} The task if found, null otherwise
   */
  getTask(termHash) {
    return this.shortTermTasks.get(termHash) || this.longTermTasks.get(termHash) || null;
  }

  /**
   * Retrieves all implication tasks where the given term is the premise.
   * @param {Term} premise - The premise term
   * @returns {Task[]|null} Array of tasks or null if none found
   */
  getImplicationsByPremise(premise) {
    const hashes = this.indexManager.getImplicationHashesByPremise(premise.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  /**
   * Retrieves all inheritance tasks where the given term is the predicate.
   * @param {Term} predicate - The predicate term
   * @returns {Task[]|null} Array of tasks or null if none found
   */
  getInheritanceByPredicate(predicate) {
    const hashes = this.indexManager.getInheritanceHashesByPredicate(predicate.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  /**
   * Retrieves all inheritance tasks where the given term is the subject.
   * @param {Term} subject - The subject term
   * @returns {Task[]|null} Array of tasks or null if none found
   */
  getInheritanceBySubject(subject) {
    const hashes = this.indexManager.getInheritanceHashesBySubject(subject.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  /**
   * Retrieves all similarity tasks related to the given term.
   * @param {Term} term - The term to find similarities for
   * @returns {Task[]|null} Array of tasks or null if none found
   */
  getSimilarities(term) {
    const hashes = this.indexManager.getSimilarityHashes(term.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  /**
   * Returns an array of all tasks in both short-term and long-term memory.
   * @returns {Task[]} Array of all tasks
   */
  getAllTasks() {
    return Array.from(this.shortTermTasks.values()).concat(Array.from(this.longTermTasks.values()));
  }

  /**
   * Retrieves tasks within a specific time range.
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {Task[]} Array of tasks within the time range
   */
  getTasksByTimeRange(startTime, endTime) {
    const hashes = this.indexManager.getTaskHashesByTimeRange(startTime, endTime);
    return this._getTasksFromHashes(hashes);
  }

  /**
   * Creates or retrieves an atomic concept from memory, ensuring uniqueness.
   * @param {string} name - The name of the atomic term
   * @param {number} createdAt - The creation timestamp
   * @returns {Concept} The concept for the atomic term
   */
  createOrGetAtomConcept(name, createdAt) {
    // For atoms, we can compute the hash without creating a full Term object first
    // In real implementation, we would use the same hashing algorithm as in Term.js
    // For now, using a simple hash based on name
    const tempHash = this._simpleHash(name + '_atom');
    
    if (this.conceptStorage.has(tempHash)) {
      return this.conceptStorage.get(tempHash);
    }

    // Create a new term and concept for the atom
    const newTerm = { name, termType: 'atom', complexity: 1, hash: tempHash };
    const newConcept = new Concept(newTerm, createdAt);
    this.conceptStorage.set(tempHash, newConcept);
    return newConcept;
  }

  /**
   * Removes a task from memory completely, updating storage and indexes.
   * @param {string} termHash - The hash of the term to remove
   * @returns {boolean} True if the task was removed, false if it didn't exist
   */
  removeTask(termHash) {
    // Try to remove from short-term first, otherwise long-term
    const taskToRemove = this.shortTermTasks.get(termHash) || this.longTermTasks.get(termHash);
    
    if (!taskToRemove) return false;
    
    // Remove from the appropriate storage
    if (this.shortTermTasks.has(termHash)) {
      this.shortTermTasks.delete(termHash);
    } else {
      this.longTermTasks.delete(termHash);
    }

    // Update total task count and remove from indexes
    this.totalTasks = Math.max(0, this.totalTasks - 1);
    this.indexManager.removeTask(taskToRemove);
    return true;
  }

  /**
   * Performs a memory consolidation cycle.
   * 
   * This process involves three main activities:
   * 1. Forgetting: Removing tasks that have expired.
   * 2. Decaying: Reducing the priority of tasks that haven't been accessed recently.
   * 3. Promoting: Moving high-priority tasks from short-term to long-term memory.
   * 
   * @param {number} currentTime - The current timestamp
   */
  consolidate(currentTime) {
    // --- 1. Forgetting ---
    for (const [hash, task] of this.shortTermTasks) {
      if (task.isExpired(currentTime)) {
        this.removeTask(hash);
      }
    }

    // --- 2. Priority Decay ---
    // A small, constant factor by which priority decays each cycle for inactive tasks.
    const priorityDecayFactor = 0.001;

    this.getAllTasks().forEach(task => {
      // Only decay priority if the task was not accessed in the current cycle.
      if (task.getAccessedAt() < currentTime) {
        const newPriority = Math.max(0.0, task.getPriority() - priorityDecayFactor);
        task.setPriority(newPriority);
      }
    });

    // --- 3. Promotion to Long-Term Memory ---
    const tasksToPromote = [...this.shortTermTasks.entries()].filter(([hash, task]) => 
      task.getPriority() >= 0.7  // Threshold for promotion
    );

    for (const [hash, task] of tasksToPromote) {
      this.shortTermTasks.delete(hash);
      this.longTermTasks.set(hash, task);
    }

    this.consolidationCount++;
    this.lastConsolidation = currentTime;
  }

  /**
   * Helper function to convert a collection of task hashes into an array of tasks.
   * @private
   * @param {Set|string[]} taskHashes - Collection of task hashes
   * @returns {Task[]} Array of tasks
   */
  _getTasksFromHashes(taskHashes) {
    return Array.from(taskHashes)
      .map(hash => this.getTask(hash))
      .filter(task => task !== null);
  }

  /**
   * Recursively ensures that a concept for the given term and all its sub-terms exist in memory.
   * @private
   * @param {Term} term - The term to ensure concept exists for
   * @param {number} currentTime - The current timestamp
   */
  _ensureConceptExistsRecursive(term, currentTime) {
    // If it's a compound term, first ensure its components exist (post-order traversal).
    if (term.components && Array.isArray(term.components)) {
      term.components.forEach(component => this._ensureConceptExistsRecursive(component, currentTime));
    }

    // Now, handle the current term. Use hash map to insert only if it doesn't exist.
    if (!this.conceptStorage.has(term.hash)) {
      this.conceptStorage.set(term.hash, new Concept(term, currentTime));
    }
  }

  /**
   * Simple hash function for temporary use until proper Term hash integration.
   * @private
   * @param {string} str - String to hash
   * @returns {string} Simple hash of the string
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}