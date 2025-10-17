/**
 * Advanced memory consolidation algorithms with activation propagation
 * Implements sophisticated forgetting policies and concept activation management
 */
export class MemoryConsolidation {
    constructor(config = {}) {
        this._config = {
            activationThreshold: 0.1,
            decayRate: 0.05,
            propagationFactor: 0.3,
            minTasksForDecay: 2,
            consolidationInterval: 100,
            ...config
        };
    }

    /**
     * Apply consolidation algorithms to memory
     */
    consolidate(memory, currentTime = Date.now()) {
        const results = {
            conceptsRemoved: 0,
            activationPropagated: 0,
            conceptsDecayed: 0,
            timestamp: currentTime
        };

        // Phase 1: Activation propagation
        results.activationPropagated = this._propagateActivation(memory);

        // Phase 2: Apply decay to all concepts
        results.conceptsDecayed = this._applyDecay(memory);

        // Phase 3: Remove decayed concepts
        results.conceptsRemoved = this._removeDecayedConcepts(memory);

        return results;
    }

    /**
     * Propagate activation between related concepts
     * @private
     */
    _propagateActivation(memory) {
        let propagated = 0;
        const concepts = memory.getAllConcepts();

        for (const concept of concepts) {
            if (concept.activation > this._config.activationThreshold) {
                const relatedConcepts = this._findRelatedConcepts(concept, memory);
                for (const relatedConcept of relatedConcepts) {
                    const activationBoost = concept.activation * this._config.propagationFactor;
                    relatedConcept.boostActivation(activationBoost);
                    propagated++;
                }
            }
        }

        return propagated;
    }

    /**
     * Find concepts related to the given concept
     * @private
     */
    _findRelatedConcepts(concept, memory) {
        const relatedConcepts = [];
        const term = concept.term;

        // Find concepts with similar terms
        for (const otherConcept of memory.getAllConcepts()) {
            if (otherConcept === concept) continue;

            const similarity = this._calculateTermSimilarity(term, otherConcept.term);
            if (similarity > 0.3) { // Threshold for relatedness
                relatedConcepts.push(otherConcept);
            }
        }

        return relatedConcepts;
    }

    /**
     * Calculate similarity between two terms
     * @private
     */
    _calculateTermSimilarity(term1, term2) {
        // Simple string-based similarity for atomic terms
        if (term1.isAtomic && term2.isAtomic) {
            return term1.toString() === term2.toString() ? 1.0 : 0.0;
        }

        // Structural similarity for compound terms
        if (term1.operator === term2.operator && term1.components.length === term2.components.length) {
            let totalSimilarity = 0;
            for (let i = 0; i < term1.components.length; i++) {
                totalSimilarity += this._calculateTermSimilarity(term1.components[i], term2.components[i]);
            }
            return totalSimilarity / term1.components.length;
        }

        return 0.0;
    }

    /**
     * Apply decay to all concepts based on usage patterns
     * @private
     */
    _applyDecay(memory) {
        let decayed = 0;
        const concepts = memory.getAllConcepts();

        for (const concept of concepts) {
            // Base decay rate
            let decayRate = this._config.decayRate;

            // Increase decay for unused concepts
            if (concept.useCount < 2) {
                decayRate *= 2;
            }

            // Decrease decay for frequently used concepts
            if (concept.useCount > 10) {
                decayRate *= 0.5;
            }

            concept.applyDecay(decayRate);
            decayed++;
        }

        return decayed;
    }

    /**
     * Remove concepts that have decayed below threshold
     * @private
     */
    _removeDecayedConcepts(memory) {
        let removed = 0;
        const conceptsToRemove = [];

        for (const concept of memory.getAllConcepts()) {
            const shouldRemove =
                concept.activation < this._config.activationThreshold &&
                concept.totalTasks < this._config.minTasksForDecay;

            if (shouldRemove) {
                conceptsToRemove.push(concept.term);
            }
        }

        for (const term of conceptsToRemove) {
            memory.removeConcept(term);
            removed++;
        }

        return removed;
    }

    /**
     * Calculate memory health metrics
     */
    calculateHealthMetrics(memory) {
        const concepts = memory.getAllConcepts();
        if (concepts.length === 0) {
            return {
                averageActivation: 0,
                averageQuality: 0,
                memoryEfficiency: 1,
                consolidationNeeded: false
            };
        }

        const totalActivation = concepts.reduce((sum, c) => sum + c.activation, 0);
        const totalQuality = concepts.reduce((sum, c) => sum + c.quality, 0);
        const totalTasks = concepts.reduce((sum, c) => sum + c.totalTasks, 0);

        return {
            averageActivation: totalActivation / concepts.length,
            averageQuality: totalQuality / concepts.length,
            memoryEfficiency: totalTasks / concepts.length,
            consolidationNeeded: totalActivation / concepts.length < this._config.activationThreshold
        };
    }

    /**
     * Update consolidation configuration
     */
    configure(newConfig) {
        this._config = {...this._config, ...newConfig};
    }

    /**
     * Get current configuration
     */
    get config() {
        return {...this._config};
    }
}