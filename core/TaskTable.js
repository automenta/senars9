/**
 * TaskTable manages a collection of tasks of the same punctuation type (BELIEF, GOAL, QUESTION).
 * This provides efficient storage and retrieval of tasks based on time and relevance criteria.
 * Includes capacity limits and eviction policies for memory management.
 */
export class TaskTable {
  constructor(capacity = 1000) {
    this.tasks = new Map(); // key: createdAt timestamp, value: Task
    this.tasksByOccurrenceTime = new Map(); // key: occurrenceTime, value: Set of tasks
    this.capacity = capacity;
    this.accessTime = new Map(); // track access times for LRU eviction
  }

  addTask(task) {
    if (this.tasks.size >= this.capacity) this._evictOldestTask();
    this.tasks.set(task.createdAt, task);
    this.accessTime.set(task.createdAt, Date.now());
    if (!this.tasksByOccurrenceTime.has(task.occurrenceTime)) 
      this.tasksByOccurrenceTime.set(task.occurrenceTime, new Set());
    this.tasksByOccurrenceTime.get(task.occurrenceTime).add(task);
  }

  _evictOldestTask() {
    if (this.tasks.size === 0) return;
    const oldestKey = [...this.tasks.keys()].reduce((min, key) => key < min ? key : min, Infinity);
    if (oldestKey !== Infinity) this._removeTaskInternal(this.tasks.get(oldestKey));
  }

  _removeTaskInternal(task) {
    this.tasks.delete(task.createdAt);
    this.accessTime.delete(task.createdAt);
    const tasksAtTime = this.tasksByOccurrenceTime.get(task.occurrenceTime);
    if (tasksAtTime) {
      tasksAtTime.delete(task);
      if (tasksAtTime.size === 0) this.tasksByOccurrenceTime.delete(task.occurrenceTime);
    }
  }

  removeTask(task) { this._removeTaskInternal(task); }

  queryTasks(punctuation, time = Infinity, selectionCriteria = null, limit = 100) {
    const tasks = [...this.tasks.values()].filter(task => 
      task.punctuation === punctuation && (
        time === Infinity || 
        (task.occurrenceTime >= 0 && time === task.occurrenceTime) || 
        time === 'latest'
      )
    );

    const sortedTasks = this._applyRanking(tasks, selectionCriteria);
    return sortedTasks.slice(0, limit);
  }

  _applyRanking(tasks, selectionCriteria) {
    if (!selectionCriteria) 
      return tasks.sort((a, b) => b.occurrenceTime - a.occurrenceTime); // Default: most recent first

    if (typeof selectionCriteria === 'function') 
      return tasks.sort(selectionCriteria);

    if (typeof selectionCriteria === 'object') {
      const { timeWeight = 0.5, confidenceWeight = 0.5, customRanking = null, timeImportance = 'recency' } = selectionCriteria;
      return customRanking ? tasks.sort(customRanking) : this._rankByWeights(tasks, timeWeight, confidenceWeight, timeImportance);
    }

    return tasks;
  }

  _rankByWeights(tasks, timeWeight, confidenceWeight, timeImportance) {
    return tasks.sort((a, b) => {
      const [scoreA, scoreB] = timeImportance === 'recency' 
        ? this._calculateRecencyScores(a, b, timeWeight, confidenceWeight)
        : this._calculateRelevanceScores(a, b, timeWeight, confidenceWeight);
      return scoreB - scoreA;
    });
  }

  _calculateRecencyScores(a, b, timeWeight, confidenceWeight) {
    const maxTime = Math.max(a.occurrenceTime, b.occurrenceTime, 1);
    const timeScoreA = (a.occurrenceTime / maxTime) * timeWeight;
    const timeScoreB = (b.occurrenceTime / maxTime) * timeWeight;
    const confScoreA = (a.truth?.confidence || 0) * confidenceWeight;
    const confScoreB = (b.truth?.confidence || 0) * confidenceWeight;
    return [timeScoreA + confScoreA, timeScoreB + confScoreB];
  }

  _calculateRelevanceScores(a, b, timeWeight, confidenceWeight) {
    const normFactor = 1000000;
    const timeScoreA = (a.occurrenceTime / normFactor) * timeWeight;
    const timeScoreB = (b.occurrenceTime / normFactor) * timeWeight;
    const confScoreA = (a.truth?.confidence || 0) * confidenceWeight;
    const confScoreB = (b.truth?.confidence || 0) * confidenceWeight;
    return [confScoreA + timeScoreA, confScoreB + timeScoreB];
  }

  getAllTasks() { return Array.from(this.tasks.values()); }
  size() { return this.tasks.size; }
  clear() { this.tasks.clear(); this.tasksByOccurrenceTime.clear(); }
}

/**
 * Common selection criteria presets for task selection
 */
export const SelectionCriteria = {
  // Prioritize by recency (time-based)
  MOST_RECENT: { timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'recency' },
  
  // Prioritize by confidence/truth value
  HIGHEST_CONFIDENCE: { timeWeight: 0.0, confidenceWeight: 1.0, timeImportance: 'relevance' },
  
  // Balanced approach weighing both time and confidence
  BALANCED: { timeWeight: 0.5, confidenceWeight: 0.5, timeImportance: 'recency' },
  
  // For beliefs: prioritize recency and confidence
  BELIEF_DEFAULT: { timeWeight: 0.6, confidenceWeight: 0.4, timeImportance: 'recency' },
  
  // For goals: prioritize priority and urgency
  GOAL_DEFAULT: { 
    customRanking: (a, b) => {
      const priorityDiff = b.getPriority() - a.getPriority();
      if (priorityDiff !== 0) return priorityDiff;
      return b.occurrenceTime - a.occurrenceTime;
    }
  },
  
  // For questions: prioritize recency
  QUESTION_DEFAULT: { timeWeight: 1.0, confidenceWeight: 0.0, timeImportance: 'recency' }
};

/**
 * Default aggregation functions for combining multiple truths
 */
export const DefaultAggregationFunctions = {
  // Simple average of frequency and confidence
  average: (tasks) => {
    if (tasks.length === 0) return null;
    
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    
    let totalFreq = 0;
    let totalConf = 0;
    
    for (const task of validTasks) {
      totalFreq += task.truth.frequency;
      totalConf += task.truth.confidence;
    }
    
    return {
      frequency: totalFreq / validTasks.length,
      confidence: totalConf / validTasks.length
    };
  },
  
  // Weighted average based on confidence
  weighted: (tasks) => {
    if (tasks.length === 0) return null;
    
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    
    let weightedFreq = 0;
    let totalWeight = 0;
    
    for (const task of validTasks) {
      const weight = task.truth.confidence;
      weightedFreq += task.truth.frequency * weight;
      totalWeight += weight;
    }
    
    if (totalWeight === 0) return null;
    
    return {
      frequency: weightedFreq / totalWeight,
      confidence: totalWeight / validTasks.length
    };
  },
  
  // Most recent truth
  mostRecent: (tasks) => {
    if (tasks.length === 0) return null;
    
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    
    validTasks.sort((a, b) => b.occurrenceTime - a.occurrenceTime);
    const mostRecent = validTasks[0];
    
    return {
      frequency: mostRecent.truth.frequency,
      confidence: mostRecent.truth.confidence
    };
  },
  
  // Strongest confidence truth
  strongest: (tasks) => {
    if (tasks.length === 0) return null;
    
    const validTasks = tasks.filter(task => task.truth);
    if (validTasks.length === 0) return null;
    
    let strongest = validTasks[0];
    for (const task of validTasks) {
      if (task.truth.confidence > strongest.truth.confidence) {
        strongest = task;
      }
    }
    
    return {
      frequency: strongest.truth.frequency,
      confidence: strongest.truth.confidence
    };
  }
};