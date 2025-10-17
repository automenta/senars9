import {Concept} from './Concept.js';
import {MemoryIndex} from './MemoryIndex.js';
import {MemoryConsolidation} from './MemoryConsolidation.js';
import {TaskPromotionManager} from './TaskPromotionManager.js';

export class Memory {
    constructor(config) {
        if (!config) {
            throw new Error('Memory requires a configuration object');
        }
        
        this._config = {
            priorityThreshold: 0.5,
            priorityDecayRate: 0.01,
            consolidationInterval: 10,
            ...config
        };
        
        this._concepts = new Map();
        this._focusConcepts = new Set();
        this._index = new MemoryIndex();
        this._consolidation = new MemoryConsolidation();
        this._promotionManager = new TaskPromotionManager();
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
        return {activation: 0.5, useCount: 0.3, taskCount: 0.2};
    }

    static get NORMALIZATION_LIMITS() {
        return {useCount: 100, taskCount: 50};
    }

    static get CONSOLIDATION_THRESHOLDS() {
        return {activationThreshold: 0.1, minTasksThreshold: 5, decayThreshold: 0.01, minTasksForDecay: 2};
    }

    static get ACTIVATION_MULTIPLIERS() {
        return {globalDecay: 0.9, averagePriority: 0.5};
    }

    get concepts() {
        return new Map(this._concepts);
    }

    get focusConcepts() {
        return new Set(this._focusConcepts);
    }

    get stats() {
        return {...this._stats};
    }

    get config() {
        return this._config;
    }

    addTask(task, currentTime = Date.now()) {
        if (!task) {
            throw new Error('Memory.addTask: task is required');
        }
        if (!task.term) {
            throw new Error('Memory.addTask: task must have a term');
        }
        
        const term = task.term;

        let concept = this._concepts.get(term);
        if (!concept) {
            concept = new Concept(term, this._config);
            this._concepts.set(term, concept);
            this._index.addConcept(concept);
            this._stats.totalConcepts++;
        }

        const added = concept.addTask(task);
        if (added) {
            this._stats.totalTasks++;
            if (task.priority >= this._config.priorityThreshold) {
                this._focusConcepts.add(concept);
                this._updateFocusConceptsCount();
            }
        }
        return added;
    }

    getConcept(term) {
        if (!term) {
            throw new Error('Memory.getConcept: term is required');
        }
        
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

        return concepts.filter(c => {
            if (criteria.minActivation !== undefined && c.activation < criteria.minActivation) return false;
            if (criteria.minTasks !== undefined && c.totalTasks < criteria.minTasks) return false;
            if (criteria.taskType && c.getTasksByType(criteria.taskType).length === 0) return false;
            if (criteria.onlyFocus === true && !this._focusConcepts.has(c)) return false;
            return true;
        });
    }

    getMostActiveConcepts(limit = 10) {
        const {activation, useCount, taskCount} = Memory.SCORING_WEIGHTS;
        const {useCount: useLimit, taskCount: taskLimit} = Memory.NORMALIZATION_LIMITS;

        return this.getAllConcepts()
            .map(concept => this._calculateConceptScore(concept))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({concept}) => concept);
    }

    _calculateConceptScore(concept) {
        const {activation: activationWeight, useCount: useCountWeight, taskCount: taskCountWeight} = Memory.SCORING_WEIGHTS;
        const {useCount: useLimit, taskCount: taskLimit} = Memory.NORMALIZATION_LIMITS;
        
        const normalizedUseCount = Math.min(concept.useCount / useLimit, 1);
        const normalizedTaskCount = Math.min(concept.totalTasks / taskLimit, 1);
        const score = concept.activation * activationWeight +
            normalizedUseCount * useCountWeight +
            normalizedTaskCount * taskCountWeight;

        return {concept, score};
    }

    removeConcept(term) {
        if (!term) {
            throw new Error('Memory.removeConcept: term is required');
        }
        
        const concept = this._concepts.get(term);
        if (!concept) return false;

        if (this._focusConcepts.has(concept)) {
            this._focusConcepts.delete(concept);
            this._updateFocusConceptsCount();
        }

        this._concepts.delete(term);
        this._index.removeConcept(concept);
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

        // Use enhanced consolidation algorithm
        const consolidationResults = this._consolidation.consolidate(this, currentTime);

        // Legacy consolidation for focus concepts
        const {activationThreshold, minTasksThreshold} = Memory.CONSOLIDATION_THRESHOLDS;
        for (const concept of this._focusConcepts) {
            if (concept.activation < activationThreshold && concept.totalTasks < minTasksThreshold) {
                this._focusConcepts.delete(concept);
            }
        }

        this._updateFocusConceptsCount();
        return consolidationResults;
    }

    _applyGlobalDecay() {
        const decayRate = this._config.priorityDecayRate;
        const {globalDecay, averagePriority} = Memory.ACTIVATION_MULTIPLIERS;

        for (const concept of this._concepts.values()) {
            concept.applyDecay(decayRate);
            const avgPriority = concept.averagePriority;
            concept._activation = Math.max(concept._activation * globalDecay, avgPriority * averagePriority);
        }
    }

    _removeDecayedConcepts() {
        const {decayThreshold, minTasksForDecay} = Memory.CONSOLIDATION_THRESHOLDS;
        const conceptsToRemove = [];

        for (const [term, concept] of this._concepts) {
            if (concept.activation < decayThreshold && concept.totalTasks < minTasksForDecay) {
                conceptsToRemove.push(term);
            }
        }
        conceptsToRemove.forEach(term => this.removeConcept(term));
    }

    boostConceptActivation(term, boostAmount = 0.1) {
        const concept = this._concepts.get(term);
        if (concept) {
            concept.boostActivation(boostAmount);
            if (!this._focusConcepts.has(concept)) {
                this._focusConcepts.add(concept);
                this._updateFocusConceptsCount();
            }
        }
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
            indexStats: this._index.getStats(),
            oldestConcept: hasConcepts ? Math.min(...conceptStats.map(s => s.createdAt)) : null,
            newestConcept: hasConcepts ? Math.max(...conceptStats.map(s => s.createdAt)) : null,
            averageActivation: hasConcepts ? conceptStats.reduce((sum, s) => sum + s.activation, 0) / conceptStats.length : 0,
            averageQuality: hasConcepts ? conceptStats.reduce((sum, s) => sum + s.quality, 0) / conceptStats.length : 0
        };
    }

    /**
     * Get memory health metrics
     */
    getHealthMetrics() {
        return this._consolidation.calculateHealthMetrics(this);
    }

    /**
     * Helper method to update focus concepts count in stats
     * @private
     */
    _updateFocusConceptsCount() {
        this._stats.focusConceptsCount = this._focusConcepts.size;
    }

    clear() {
        this._concepts.clear();
        this._focusConcepts.clear();
        this._index.clear();
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
            concept.getTasksByType('BELIEF').some(task => task.term.equals(pattern))
        );
    }
}