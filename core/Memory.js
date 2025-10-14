import { Logger } from './base/utilities.js';
import { Concept } from './Concept.js';
import { DEFAULTS } from './base/constants.js';

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
    !this.timeIndex.has(timeKey) && this.timeIndex.set(timeKey, new Set());
    this.timeIndex.get(timeKey).add(taskHash);

    const indexMap = {
      implication: () => term.subject && this._add(this.implicationIndex, term.subject.hash, taskHash),
      inheritance: () => {
        term.subject && this._add(this.inheritanceIndexBySubject, term.subject.hash, taskHash);
        term.predicate && this._add(this.inheritanceIndexByPredicate, term.predicate.hash, taskHash);
      },
      similarity: () => {
        term.subject && this._add(this.similarityIndex, term.subject.hash, taskHash);
        term.predicate && this._add(this.similarityIndex, term.predicate.hash, taskHash);
      },
      operation: () => term.subject && this._add(this.operationIndex, term.subject.hash, taskHash)
    };
    indexMap[term.termType]?.();
  }

  removeTask(task) {
    const {term} = task, taskHash = term.hash, timeKey = Math.floor(task.occurrenceTime / 1000);
    this.timeIndex.has(timeKey) && this.timeIndex.get(timeKey).delete(taskHash);

    const indexMap = {
      implication: () => term.subject && this._remove(this.implicationIndex, term.subject.hash, taskHash),
      inheritance: () => {
        term.subject && this._remove(this.inheritanceIndexBySubject, term.subject.hash, taskHash);
        term.predicate && this._remove(this.inheritanceIndexByPredicate, term.predicate.hash, taskHash);
      },
      similarity: () => {
        term.subject && this._remove(this.similarityIndex, term.subject.hash, taskHash);
        term.predicate && this._remove(this.similarityIndex, term.predicate.hash, taskHash);
      },
      operation: () => term.subject && this._remove(this.operationIndex, term.subject.hash, taskHash)
    };
    indexMap[term.termType]?.();
  }

  _add(index, key, value) {
    !index.has(key) && index.set(key, new Set());
    index.get(key).add(value);
  }

  _remove(index, key, value) {
    if (index.has(key)) {
      index.get(key).delete(value);
      index.get(key).size === 0 && index.delete(key);
    }
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

export class Memory {
  constructor() {
    this.conceptStorage = new Map();
    this.shortTermTasks = new Map();
    this.longTermTasks = new Map();
    this.indexManager = new IndexManager();
    this.totalTasks = 0;
    this.consolidationCount = 0;
    this.lastConsolidation = 0;
  }

  addTask(task, currentTime) {
    this._ensureConceptExistsRecursive(task.term, currentTime);
    const termHash = task.term.hash;
    !this.shortTermTasks.has(termHash) && this.totalTasks++;
    this.shortTermTasks.set(termHash, task);
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
    const conceptArray = Array.from(this.conceptStorage.entries()).map(([hash, concept]) => ({
      id: hash,
      concept,
      term: concept.term,
      taskCount: concept.taskTable?.size || 0,
      priority: concept.taskTable?.size || 0,
      createdAt: concept.createdAt || Date.now()
    }));
    conceptArray.sort((a, b) => b.taskCount - a.taskCount);
    return conceptArray.slice(0, n);
  }

  getTopTasks(n = 10) {
    const allTasks = this.getAllTasks();
    if (allTasks.length === 0) return [];
    allTasks.sort((a, b) => {
      const priorityB = b.getPriority?.() || b.priority || 0.5;
      const priorityA = a.getPriority?.() || a.priority || 0.5;
      return priorityB - priorityA;
    });
    return allTasks.slice(0, n);
  }
}