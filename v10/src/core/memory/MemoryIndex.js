/**
 * Specialized indexing system for efficient memory retrieval
 * Supports different term types: inheritance, implication, similarity, etc.
 */
export class MemoryIndex {
    constructor() {
        this._inheritanceIndex = new Map(); // Map<predicate, Set<subject>>
        this._implicationIndex = new Map(); // Map<premise, Set<conclusion>>
        this._similarityIndex = new Map(); // Map<term1, Set<term2>>
        this._compoundIndex = new Map(); // Map<operator, Set<terms>>
        this._termIndex = new Map(); // Map<termHash, concept>
    }

    /**
     * Add concept to appropriate indexes
     */
    addConcept(concept) {
        const term = concept.term;
        const termId = term.id;

        // Add to main term index
        this._termIndex.set(termId, concept);

        // Index by term type
        if (term.isAtomic) {
            this._indexAtomicTerm(term, concept);
        } else {
            this._indexCompoundTerm(term, concept);
        }
    }

    /**
     * Remove concept from indexes
     */
    removeConcept(concept) {
        const term = concept.term;
        const termId = term.id;

        // Remove from main term index
        this._termIndex.delete(termId);

        // Remove from specialized indexes
        if (term.isAtomic) {
            this._removeAtomicTermIndex(term);
        } else {
            this._removeCompoundTermIndex(term);
        }
    }

    /**
     * Index atomic terms
     * @private
     */
    _indexAtomicTerm(term, concept) {
        // Atomic terms are primarily indexed by their string representation
        // Could be enhanced with semantic indexing in the future
    }

    /**
     * Index compound terms by their structure
     * @private
     */
    _indexCompoundTerm(term, concept) {
        const operator = term.operator;

        // Initialize operator index if needed
        if (!this._compoundIndex.has(operator)) {
            this._compoundIndex.set(operator, new Set());
        }
        this._compoundIndex.get(operator).add(term);

        // Index by specific operator types
        switch (operator) {
            case '-->':
                this._indexInheritance(term, concept);
                break;
            case '==>':
                this._indexImplication(term, concept);
                break;
            case '<->':
                this._indexSimilarity(term, concept);
                break;
        }
    }

    /**
     * Index inheritance relationships (A --> B)
     * @private
     */
    _indexInheritance(term, concept) {
        if (term.components.length >= 2) {
            const subject = term.components[0];
            const predicate = term.components[1];

            if (!this._inheritanceIndex.has(predicate)) {
                this._inheritanceIndex.set(predicate, new Set());
            }
            this._inheritanceIndex.get(predicate).add(subject);
        }
    }

    /**
     * Index implication relationships (A ==> B)
     * @private
     */
    _indexImplication(term, concept) {
        if (term.components.length >= 2) {
            const premise = term.components[0];
            const conclusion = term.components[1];

            if (!this._implicationIndex.has(premise)) {
                this._implicationIndex.set(premise, new Set());
            }
            this._implicationIndex.get(premise).add(conclusion);
        }
    }

    /**
     * Index similarity relationships (A <-> B)
     * @private
     */
    _indexSimilarity(term, concept) {
        if (term.components.length >= 2) {
            const term1 = term.components[0];
            const term2 = term.components[1];

            if (!this._similarityIndex.has(term1)) {
                this._similarityIndex.set(term1, new Set());
            }
            if (!this._similarityIndex.has(term2)) {
                this._similarityIndex.set(term2, new Set());
            }

            this._similarityIndex.get(term1).add(term2);
            this._similarityIndex.get(term2).add(term1);
        }
    }

    /**
     * Remove atomic term from indexes
     * @private
     */
    _removeAtomicTermIndex(term) {
        // Atomic terms don't need special cleanup
    }

    /**
     * Remove compound term from indexes
     * @private
     */
    _removeCompoundTermIndex(term) {
        const operator = term.operator;

        // Remove from operator index
        if (this._compoundIndex.has(operator)) {
            this._compoundIndex.get(operator).delete(term);
            if (this._compoundIndex.get(operator).size === 0) {
                this._compoundIndex.delete(operator);
            }
        }

        // Remove from specific indexes
        switch (operator) {
            case '-->':
                this._removeInheritanceIndex(term);
                break;
            case '==>':
                this._removeImplicationIndex(term);
                break;
            case '<->':
                this._removeSimilarityIndex(term);
                break;
        }
    }

    /**
     * Remove inheritance index entries
     * @private
     */
    _removeInheritanceIndex(term) {
        if (term.components.length >= 2) {
            const subject = term.components[0];
            const predicate = term.components[1];

            if (this._inheritanceIndex.has(predicate)) {
                this._inheritanceIndex.get(predicate).delete(subject);
                if (this._inheritanceIndex.get(predicate).size === 0) {
                    this._inheritanceIndex.delete(predicate);
                }
            }
        }
    }

    /**
     * Remove implication index entries
     * @private
     */
    _removeImplicationIndex(term) {
        if (term.components.length >= 2) {
            const premise = term.components[0];
            const conclusion = term.components[1];

            if (this._implicationIndex.has(premise)) {
                this._implicationIndex.get(premise).delete(conclusion);
                if (this._implicationIndex.get(premise).size === 0) {
                    this._implicationIndex.delete(premise);
                }
            }
        }
    }

    /**
     * Remove similarity index entries
     * @private
     */
    _removeSimilarityIndex(term) {
        if (term.components.length >= 2) {
            const term1 = term.components[0];
            const term2 = term.components[1];

            if (this._similarityIndex.has(term1)) {
                this._similarityIndex.get(term1).delete(term2);
                if (this._similarityIndex.get(term1).size === 0) {
                    this._similarityIndex.delete(term1);
                }
            }

            if (this._similarityIndex.has(term2)) {
                this._similarityIndex.get(term2).delete(term1);
                if (this._similarityIndex.get(term2).size === 0) {
                    this._similarityIndex.delete(term2);
                }
            }
        }
    }

    /**
     * Find concepts with inheritance relationships
     */
    findInheritanceConcepts(predicate) {
        const subjects = this._inheritanceIndex.get(predicate) || new Set();
        return Array.from(subjects)
            .map(subject => this._termIndex.get(subject.id))
            .filter(concept => concept !== undefined);
    }

    /**
     * Find concepts with implication relationships
     */
    findImplicationConcepts(premise) {
        const conclusions = this._implicationIndex.get(premise) || new Set();
        return Array.from(conclusions)
            .map(conclusion => this._termIndex.get(conclusion.id))
            .filter(concept => concept !== undefined);
    }

    /**
     * Find concepts with similarity relationships
     */
    findSimilarityConcepts(term) {
        const similarTerms = this._similarityIndex.get(term) || new Set();
        return Array.from(similarTerms)
            .map(similarTerm => this._termIndex.get(similarTerm.id))
            .filter(concept => concept !== undefined);
    }

    /**
     * Find concepts by operator type
     */
    findConceptsByOperator(operator) {
        const terms = this._compoundIndex.get(operator) || new Set();
        return Array.from(terms)
            .map(term => this._termIndex.get(term.id))
            .filter(concept => concept !== undefined);
    }

    /**
     * Get concept by term hash
     */
    getConcept(termHash) {
        return this._termIndex.get(termHash);
    }

    /**
     * Get all indexed concepts
     */
    getAllConcepts() {
        return Array.from(this._termIndex.values());
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            totalConcepts: this._termIndex.size,
            inheritanceEntries: this._inheritanceIndex.size,
            implicationEntries: this._implicationIndex.size,
            similarityEntries: this._similarityIndex.size,
            operatorEntries: this._compoundIndex.size,
            compoundTermsByOperator: Object.fromEntries(
                Array.from(this._compoundIndex.entries()).map(([op, terms]) => [op, terms.size])
            )
        };
    }

    /**
     * Clear all indexes
     */
    clear() {
        this._inheritanceIndex.clear();
        this._implicationIndex.clear();
        this._similarityIndex.clear();
        this._compoundIndex.clear();
        this._termIndex.clear();
    }
}