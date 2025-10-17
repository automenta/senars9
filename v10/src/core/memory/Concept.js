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
    const storageMap = { BELIEF: this._beliefs, GOAL: this._goals, QUESTION: this._questions };
    return storageMap[taskType] || (() => { throw new Error(`Unknown task type: ${taskType}`); })();
  }

  addTask(task) {
    const storage = this._getStorage(task.type);
    const added = storage.add(task, task.priority);
    added && (this._lastAccessed = Date.now(), this._useCount++);
    return added;
  }

  getHighestPriorityTask(taskType) {
    return this._getStorage(taskType).peek() || null;
  }

  getTasksByType(taskType) {
    return this._getStorage(taskType).getItemsInPriorityOrder() || [];
  }

  removeTask(task) {
    const removed = this._getStorage(task.type).remove(task);
    removed && (this._lastAccessed = Date.now());
    return removed || false;
  }

  updateTaskPriority(task, newPriority) {
    const updated = this._getStorage(task.type).updatePriority(task, newPriority);
    updated && (this._lastAccessed = Date.now());
    return updated || false;
  }

 applyDecay(decayRate = 0.01) {
   this._beliefs.applyDecay(decayRate);
   this._goals.applyDecay(decayRate);
   this._questions.applyDecay(decayRate);
   this._activation *= (1 - decayRate);
   this._lastAccessed = Date.now();
 }

 boostActivation(activationBoost = 0.1) {
   this._activation = Math.min(1.0, this._activation + activationBoost);
   this._lastAccessed = Date.now();
   this.incrementUseCount();
 }

 incrementUseCount() {
   this._useCount++;
 }

 updateQuality(qualityChange) {
   this._quality = Math.max(0, Math.min(1, this._quality + qualityChange));
 }

 containsTask(task) {
   return this._beliefs.contains(task) || this._goals.contains(task) || this._questions.contains(task);
 }

 getAllTasks() {
   return [
     ...this._beliefs.getItemsInPriorityOrder(),
     ...this._goals.getItemsInPriorityOrder(),
     ...this._questions.getItemsInPriorityOrder()
   ].sort((a, b) => b.priority - a.priority);
 }

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