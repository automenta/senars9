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

 static get SCORING_WEIGHTS() {
   return { activation: 0.5, useCount: 0.3, taskCount: 0.2 };
 }

 static get NORMALIZATION_LIMITS() {
   return { useCount: 100, taskCount: 50 };
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

  getAllConcepts() {
    return Array.from(this._concepts.values());
  }

  getConceptsByCriteria(criteria = {}) {
    let concepts = this.getAllConcepts();

    criteria.minActivation !== undefined &&
      (concepts = concepts.filter(c => c.activation >= criteria.minActivation));

    criteria.minTasks !== undefined &&
      (concepts = concepts.filter(c => c.totalTasks >= criteria.minTasks));

    criteria.taskType &&
      (concepts = concepts.filter(c => c.getTasksByType(criteria.taskType).length > 0));

    criteria.onlyFocus === true &&
      (concepts = concepts.filter(c => this._focusConcepts.has(c)));

    return concepts;
  }

  getMostActiveConcepts(limit = 10) {
    const allConcepts = this.getAllConcepts();
    const { activation, useCount, taskCount } = Memory.SCORING_WEIGHTS;
    const { useCount: useLimit, taskCount: taskLimit } = Memory.NORMALIZATION_LIMITS;

    const scoredConcepts = allConcepts.map(concept => ({
      concept,
      score: concept.activation * activation +
             Math.min(concept.useCount / useLimit, 1) * useCount +
             Math.min(concept.totalTasks / taskLimit, 1) * taskCount
    }));

    return scoredConcepts.sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.concept);
  }

 removeConcept(term) {
   const concept = this._concepts.get(term);
   if (!concept) return false;

   this._focusConcepts.has(concept) &&
     (this._focusConcepts.delete(concept), this._stats.focusConceptsCount = this._focusConcepts.size);

   this._concepts.delete(term);
   this._stats.totalConcepts--;
   this._stats.totalTasks -= concept.totalTasks;

   return true;
 }

 consolidate(currentTime = Date.now()) {
   if (this._cyclesSinceConsolidation < this._config.consolidationInterval) {
     this._cyclesSinceConsolidation++;
     return;
   }

   this._cyclesSinceConsolidation = 0;
   this._stats.lastConsolidation = currentTime;

   for (const concept of this._focusConcepts) {
     concept.getAllTasks().filter(task => task.priority >= this._config.priorityThreshold);

     concept.activation < 0.1 && concept.totalTasks < 5 && this._focusConcepts.delete(concept);
   }

   this._applyGlobalDecay();
   this._removeDecayedConcepts();
   this._stats.focusConceptsCount = this._focusConcepts.size;
 }

 _applyGlobalDecay() {
   const decayRate = this._config.priorityDecayRate;
   for (const concept of this._concepts.values()) {
     concept.applyDecay(decayRate);
     const avgPriority = concept.averagePriority;
     concept._activation = Math.max(concept._activation * 0.9, avgPriority * 0.5);
   }
 }

 _removeDecayedConcepts() {
   const conceptsToRemove = [];
   for (const [term, concept] of this._concepts) {
     concept.activation < 0.01 && concept.totalTasks < 2 && conceptsToRemove.push(term);
   }
   conceptsToRemove.forEach(term => this.removeConcept(term));
 }

 boostConceptActivation(term, boostAmount = 0.1) {
   const concept = this._concepts.get(term);
   concept && (concept.boostActivation(boostAmount),
               !this._focusConcepts.has(concept) &&
               (this._focusConcepts.add(concept), this._stats.focusConceptsCount = this._focusConcepts.size));
 }

 updateConceptQuality(term, qualityChange) {
   this._concepts.get(term)?.updateQuality(qualityChange);
 }

 getDetailedStats() {
   const conceptStats = this.getAllConcepts().map(c => c.getStats());
   const hasConcepts = conceptStats.length > 0;

   return {
     ...this._stats,
     conceptStats,
     memoryUsage: {
       concepts: this._concepts.size,
       focusConcepts: this._focusConcepts.size,
       totalTasks: this._stats.totalTasks
     },
     oldestConcept: hasConcepts ? Math.min(...conceptStats.map(s => s.createdAt)) : null,
     newestConcept: hasConcepts ? Math.max(...conceptStats.map(s => s.createdAt)) : null,
     averageActivation: hasConcepts ? conceptStats.reduce((sum, s) => sum + s.activation, 0) / conceptStats.length : 0,
     averageQuality: hasConcepts ? conceptStats.reduce((sum, s) => sum + s.quality, 0) / conceptStats.length : 0
   };
 }

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

 hasConcept(term) {
   return this._concepts.has(term);
 }

 getTotalTaskCount() {
   return this._stats.totalTasks;
 }

 getConceptsWithBeliefs(pattern) {
   return this.getAllConcepts().filter(concept =>
     concept.getTasksByType('BELIEF').some(task => this._termsMatch(task.term, pattern))
   );
 }

 _termsMatch(term1, term2) {
   return term1.equals(term2);
 }
}