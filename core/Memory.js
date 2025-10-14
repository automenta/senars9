import Component from './base/Component.js';
import { Logger } from './base/utilities.js';
import { Concept } from './Concept.js';
import { DEFAULTS } from './base/constants.js';
import { Validation } from './base/validation.js';

// Focus class - manages attention focus sets
class Focus extends Component {
  constructor() {
    super();
    this.focusSets = new Map();
    this.currentFocus = null;
    this.focusSize = DEFAULTS.FOCUS_SIZE;
  }

  createFocusSet(name, maxSize = this.focusSize) {
    Validation.ensureCondition(!this.focusSets.has(name), `Focus set '${name}' already exists`);
    this.focusSets.set(name, {
      items: new Map(),
      maxSize,
      accessCount: 0,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      attentionScore: 0,
      decayFactor: DEFAULTS.ATTENTION_DECAY
    });
  }

  setFocus(name) {
    Validation.ensureCondition(this.focusSets.has(name), `Focus set '${name}' does not exist`);
    this.currentFocus = name;
  }

  getCurrentFocus() {
    return this.currentFocus;
  }

  getFocusItems(count = 10) {
    const focusSet = this.focusSets.get(this.currentFocus);
    if (!focusSet) return [];

    focusSet.lastAccessed = Date.now();
    focusSet.accessCount++;

    const sortedEntries = Array.from(focusSet.items.entries())
      .sort(([, dataA], [, dataB]) => {
        const [priorityA, priorityB] = [(dataA.priority || 0), (dataB.priority || 0)];
        if (priorityA !== priorityB) return priorityB - priorityA;

        const [timestampA, timestampB] = [(dataA.timestamp || 0), (dataB.timestamp || 0)];
        if (timestampA !== timestampB) return timestampB - timestampA;

        const [accessCountA, accessCountB] = [(dataA.accessCount || 0), (dataB.accessCount || 0)];
        return accessCountB - accessCountA;
      })
      .slice(0, count)
      .map(([key, value]) => {
        value.accessCount = (value.accessCount || 0) + 1;
        return [key, value];
      });

    return sortedEntries;
  }

  updateFocusAttention(name, delta) {
    const focusSet = this.focusSets.get(name);
    if (focusSet) {
      focusSet.attentionScore = Math.max(0, Math.min(1, (focusSet.attentionScore || 0) + delta));
    }
  }

  getFocusSetStats() {
    const stats = {};
    this.focusSets.forEach((data, name) => {
      stats[name] = {
        size: data.items.size,
        maxSize: data.maxSize,
        accessCount: data.accessCount,
        attentionScore: data.attentionScore,
        utilization: data.items.size / data.maxSize,
        age: Date.now() - data.createdAt
      };
    });
    return stats;
  }

  updateFocusSets(key, options) {
    const { focusSet, priority = 0 } = options;
    if (!focusSet || !this.focusSets.has(focusSet)) return;

    const focusData = this.focusSets.get(focusSet);
    if (focusData.items.has(key)) return;

    focusData.items.set(key, { priority, timestamp: Date.now() });
    if (focusData.items.size > focusData.maxSize) {
      const firstKey = focusData.items.keys().next().value;
      focusData.items.delete(firstKey);
    }
  }

  removeFromFocusSets(key) {
    this.focusSets.forEach(focusData => focusData.items.delete(key));
  }

  clear() {
    this.focusSets.clear();
    this.currentFocus = null;
  }
}

class IndexManager {
  constructor() {
    this.implicationIndex = new Map();
    this.inheritanceIndexBySubject = new Map();
    this.inheritanceIndexByPredicate = new Map();
    this.similarityIndex = new Map();
    this.operationIndex = new Map();
    this.timeIndex = new Map();
  }

  addTask(task) {
    const {term} = task, taskHash = term.hash, timeKey = Math.floor(task.occurrenceTime / 1000);
    this._ensureTimeIndex(timeKey).add(taskHash);

    const indexOperations = {
      implication: () => term.subject && this._addIndex(this.implicationIndex, term.subject.hash, taskHash),
      inheritance: () => {
        this._addIndexByTerm(this.inheritanceIndexBySubject, term.subject, taskHash);
        this._addIndexByTerm(this.inheritanceIndexByPredicate, term.predicate, taskHash);
      },
      similarity: () => {
        this._addIndexByTerm(this.similarityIndex, term.subject, taskHash);
        this._addIndexByTerm(this.similarityIndex, term.predicate, taskHash);
      },
      operation: () => this._addIndexByTerm(this.operationIndex, term.subject, taskHash)
    };
    indexOperations[term.termType]?.();
  }

  removeTask(task) {
    const {term} = task, taskHash = term.hash, timeKey = Math.floor(task.occurrenceTime / 1000);
    this.timeIndex.get(timeKey)?.delete(taskHash);

    const indexOperations = {
      implication: () => term.subject && this._removeIndex(this.implicationIndex, term.subject.hash, taskHash),
      inheritance: () => {
        this._removeIndexByTerm(this.inheritanceIndexBySubject, term.subject, taskHash);
        this._removeIndexByTerm(this.inheritanceIndexByPredicate, term.predicate, taskHash);
      },
      similarity: () => {
        this._removeIndexByTerm(this.similarityIndex, term.subject, taskHash);
        this._removeIndexByTerm(this.similarityIndex, term.predicate, taskHash);
      },
      operation: () => this._removeIndexByTerm(this.operationIndex, term.subject, taskHash)
    };
    indexOperations[term.termType]?.();
  }

  _ensureTimeIndex(timeKey) {
    return this.timeIndex.has(timeKey) ? this.timeIndex.get(timeKey) : this.timeIndex.set(timeKey, new Set()).get(timeKey);
  }

  _addIndex(index, key, value) {
    this._ensureIndexSet(index, key).add(value);
  }

  _removeIndex(index, key, value) {
    const indexSet = index.get(key);
    if (indexSet) {
      indexSet.delete(value);
      indexSet.size === 0 && index.delete(key);
    }
  }

  _ensureIndexSet(index, key) {
    return index.has(key) ? index.get(key) : index.set(key, new Set()).get(key);
  }

  _addIndexByTerm(index, term, value) {
    term && this._addIndex(index, term.hash, value);
  }

  _removeIndexByTerm(index, term, value) {
    term && this._removeIndex(index, term.hash, value);
  }

  getImplicationHashesByPremise(premiseHash) { return this.implicationIndex.get(premiseHash) || null; }
  getInheritanceHashesByPredicate(predicateHash) { return this.inheritanceIndexByPredicate.get(predicateHash) || null; }
  getInheritanceHashesBySubject(subjectHash) { return this.inheritanceIndexBySubject.get(subjectHash) || null; }
  getSimilarityHashes(termHash) { return this.similarityIndex.get(termHash) || null; }

  getTaskHashesByTimeRange(startTime, endTime) {
    const result = new Set(), startKey = Math.floor(startTime / 1000), endKey = Math.floor(endTime / 1000);
    for (let key = startKey; key <= endKey; key++) {
      const hashes = this.timeIndex.get(key);
      if (hashes) for (const hash of hashes) result.add(hash);
    }
    return Array.from(result);
  }
}

class Memory extends Component {
  constructor(focus = null) {
    super();
    this.conceptStorage = new Map();
    this.shortTermTasks = new Map();    // Active tasks in focus
    this.longTermTasks = new Map();     // Consolidated tasks in long-term memory
    this.indexManager = new IndexManager();
    this.focus = focus;                 // Reference to focus component
    this.storage = new Map();           // General storage
    this.cache = new Map();             // Caching layer
    this.indexes = new Map();           // Indexing
    
    // Stats
    this.totalTasks = 0;
    this.consolidationCount = 0;
    this.lastConsolidation = 0;
    
    // Component-specific
    this.isInitialized = false;
  }

  async _doInitialize(config = {}) {
    // Initialize NARS-specific data
    this.conceptStorage.clear();
    this.shortTermTasks.clear();
    this.longTermTasks.clear();
    this.totalTasks = 0;
    
    // Initialize component-specific data
    this.storage.clear();
    this.cache.clear();
    this.indexes.clear();
    
    this.isInitialized = true;
  }

  // NARS-specific methods
  addTask(task, currentTime) {
    this._ensureConceptExistsRecursive(task.term, currentTime);
    const termHash = task.term.hash;
    !this.shortTermTasks.has(termHash) && this.totalTasks++;
    this.shortTermTasks.set(termHash, task);
    
    // If we have a focus component, try to add to focus as well
    if (this.focus) {
      // Add to focus if possible (assuming focus has appropriate methods)
      try {
        // This represents "becoming aware of it" - adding to focus
        if (this.focus.updateFocusSets) {
          this.focus.updateFocusSets(termHash, {
            focusSet: this.focus.getCurrentFocus?.() || 'default',
            priority: task.getPriority?.() || task.priority || 0.5
          });
        }
      } catch (e) {
        // If focus update fails, continue anyway
        console.warn('Could not update focus:', e.message);
      }
    }
    
    const concept = this.conceptStorage.get(termHash);
    concept?.addTask(task);
    this.indexManager.addTask(task);
  }

  getTask(termHash) { return this.shortTermTasks.get(termHash) || this.longTermTasks.get(termHash) || null; }

  getImplicationsByPremise(premise) {
    const hashes = this.indexManager.getImplicationHashesByPremise(premise.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getInheritanceByPredicate(predicate) {
    const hashes = this.indexManager.getInheritanceHashesByPredicate(predicate.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getInheritanceBySubject(subject) {
    const hashes = this.indexManager.getInheritanceHashesBySubject(subject.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getSimilarities(term) {
    const hashes = this.indexManager.getSimilarityHashes(term.hash);
    return hashes ? this._getTasksFromHashes(hashes) : null;
  }

  getAllTasks() { return [...this.shortTermTasks.values(), ...this.longTermTasks.values()]; }

  getTasksByTimeRange(startTime, endTime) {
    const hashes = this.indexManager.getTaskHashesByTimeRange(startTime, endTime);
    return this._getTasksFromHashes(hashes);
  }

  createOrGetAtomConcept(name, createdAt) {
    const tempHash = this._simpleHash(name + '_atom');
    if (this.conceptStorage.has(tempHash)) return this.conceptStorage.get(tempHash);
    const newTerm = { name, termType: 'atom', complexity: 1, hash: tempHash };
    const newConcept = new Concept(newTerm, createdAt);
    this.conceptStorage.set(tempHash, newConcept);
    return newConcept;
  }

  removeTask(termHash) {
    const taskToRemove = this.shortTermTasks.get(termHash) || this.longTermTasks.get(termHash);
    if (!taskToRemove) return false;
    (this.shortTermTasks.has(termHash) ? this.shortTermTasks : this.longTermTasks).delete(termHash);
    this.totalTasks = Math.max(0, this.totalTasks - 1);
    this.indexManager.removeTask(taskToRemove);
    
    // Remove from focus as well
    if (this.focus?.removeFromFocusSets) {
      this.focus.removeFromFocusSets(termHash);
    }
    
    return true;
  }

  consolidate(currentTime) {
    for (const [hash, task] of this.shortTermTasks) task.isExpired(currentTime) && this.removeTask(hash);
    const priorityDecayFactor = 0.001;
    this.getAllTasks().forEach(task => {
      if (task.getAccessedAt() < currentTime) {
        task.setPriority(Math.max(0.0, task.getPriority() - priorityDecayFactor));
      }
    });
    const tasksToPromote = [...this.shortTermTasks.entries()].filter(([, task]) => task.getPriority() >= 0.7);
    for (const [hash, task] of tasksToPromote) {
      this.shortTermTasks.delete(hash);
      this.longTermTasks.set(hash, task);
    }
    this.consolidationCount++;
    this.lastConsolidation = currentTime;
  }

  _getTasksFromHashes(taskHashes) {
    return Array.from(taskHashes).map(hash => this.getTask(hash)).filter(task => task !== null);
  }

  _ensureConceptExistsRecursive(term, currentTime) {
    if (term.components?.length) term.components.forEach(component => this._ensureConceptExistsRecursive(component, currentTime));
    !this.conceptStorage.has(term.hash) && this.conceptStorage.set(term.hash, new Concept(term, currentTime));
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  getTopConcepts(n = 10) {
    if (this.conceptStorage.size === 0) return [];
    return this._getTopItems(n, (hash, concept) => ({
      id: hash,
      concept,
      term: concept.term,
      taskCount: concept.taskTable?.size || 0,
      priority: concept.taskTable?.size || 0,
      createdAt: concept.createdAt || Date.now()
    }), 'taskCount');
  }

  getTopTasks(n = 10) {
    const allTasks = this.getAllTasks();
    if (allTasks.length === 0) return [];
    return this._getTopItems(n, task => task, this._getTaskPriority);
  }

  _getTopItems(n, mapper, sortKeyOrFn) {
    const items = Array.from(this.conceptStorage.entries()).map(([hash, concept]) => mapper(hash, concept));
    return items.sort((a, b) => {
      const aVal = typeof sortKeyOrFn === 'function' ? sortKeyOrFn(a) : a[sortKeyOrFn];
      const bVal = typeof sortKeyOrFn === 'function' ? sortKeyOrFn(b) : b[sortKeyOrFn];
      return bVal - aVal;
    }).slice(0, n);
  }

  _getTaskPriority(task) {
    return task.getPriority?.() || task.priority || 0.5;
  }
  
  // Component interface methods for general storage functionality
  get(key) {
    // Check cache first
    if (this.cache.has(key)) return this.cache.get(key);
    
    // Check storage
    if (this.storage.has(key)) {
      const value = this.storage.get(key);
      // Add to cache
      this.cache.set(key, value);
      return value;
    }
    
    return undefined;
  }

  set(key, value, options = {}) {
    this.storage.set(key, value);
    this.cache.set(key, value);
    
    // Update indexes if provided
    const { type, tags, priority } = options;
    if (type) this._updateIndex(type, key);
    if (tags && Array.isArray(tags)) {
      tags.forEach(tag => this._updateIndex(tag, key));
    }
    if (priority !== undefined) this._updateIndex(`priority_${priority}`, key);
  }

  has(key) {
    return this.cache.has(key) || this.storage.has(key);
  }

  delete(key) {
    const existed = this.storage.has(key);
    this.cache.delete(key);
    this.storage.delete(key);
    
    // Remove from all indexes
    for (const indexSet of this.indexes.values()) {
      indexSet.delete(key);
    }
    
    return existed;
  }

  // Helper for indexing
  _updateIndex(indexName, key) {
    if (!this.indexes.has(indexName)) {
      this.indexes.set(indexName, new Set());
    }
    this.indexes.get(indexName).add(key);
  }

  query(criteria = {}) {
    const { type, tags, minPriority, limit = DEFAULTS.QUERY_LIMIT } = criteria;
    
    let candidates = new Set(this.storage.keys());
    
    // Apply filters
    if (type) {
      const typeKeys = this.indexes.get(type) || new Set();
      candidates = new Set([...candidates].filter(key => typeKeys.has(key)));
    }
    
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        const tagKeys = this.indexes.get(tag) || new Set();
        candidates = new Set([...candidates].filter(key => tagKeys.has(key)));
      }
    }
    
    if (minPriority !== undefined) {
      const priorityKey = `priority_${minPriority}`;
      const priorityKeys = this.indexes.get(priorityKey) || new Set();
      candidates = new Set([...candidates].filter(key => priorityKeys.has(key)));
    }
    
    // Get values and limit results
    const results = [...candidates].slice(0, limit).map(key => ({ key, value: this.get(key) }));
    
    return results;
  }

  getStats() {
    return {
      storageSize: this.storage.size,
      cacheSize: this.cache.size,
      indexesSize: this.indexes.size,
      ...super.getStats(), // Include base component stats
      // NARS-specific stats
      totalTasks: this.totalTasks,
      shortTermTasks: this.shortTermTasks.size,
      longTermTasks: this.longTermTasks.size,
      concepts: this.conceptStorage.size,
      consolidationCount: this.consolidationCount
    };
  }
}

export default Memory;
export { Focus };