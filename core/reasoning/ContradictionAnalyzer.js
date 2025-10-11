import { Component } from '../components/Component.js';
import { Logger } from '../base/utilities.js';

/**
 * ContradictionAnalyzer - Analyzes beliefs to detect logical contradictions
 *
 * Detects contradictions between beliefs, particularly direct negations
 * where the same statement has conflicting truth values.
 */
export class ContradictionAnalyzer extends Component {
  constructor() {
    super();

    // Storage for detected contradictions
    this.contradictions = new Map(); // beliefId -> contradiction details

    // Statistics
    this.stats = {
      contradictionsDetected: 0,
      directNegations: 0,
      partialContradictions: 0,
      resolvedContradictions: 0,
      falsePositives: 0
    };

    // Configuration
    this.config = {
      detectDirectNegations: true,  // A. {1.0} and A. {0.0}
      detectPartialContradictions: true, // A. {0.8} and A. {0.1}
      threshold: 0.1  // Threshold for partial contradiction detection
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);

    // Apply configuration
    this.config = { ...this.config, ...config };

    // Clear contradictions
    this.contradictions.clear();

    // Reset statistics
    this.stats = {
      contradictionsDetected: 0,
      directNegations: 0,
      partialContradictions: 0,
      resolvedContradictions: 0,
      falsePositives: 0
    };
  }

  /**
   * Analyze a set of beliefs to find contradictions
   * @param {Array} beliefs - Array of belief objects to analyze
   * @returns {Array} - Array of detected contradictions
   */
  async analyzeBeliefs(beliefs) {
    if (!Array.isArray(beliefs) || beliefs.length < 2) {
      return [];
    }

    const contradictions = [];

    // Compare each belief with every other belief
    for (let i = 0; i < beliefs.length; i++) {
      for (let j = i + 1; j < beliefs.length; j++) {
        const beliefA = beliefs[i];
        const beliefB = beliefs[j];

        const contradiction = this._findContradiction(beliefA, beliefB);
        if (contradiction) {
          contradictions.push(contradiction);
          this._recordContradiction(contradiction);
        }
      }
    }

    return contradictions;
  }

  /**
   * Find contradiction between two beliefs
   * @private
   */
  _findContradiction(beliefA, beliefB) {
    if (!beliefA || !beliefB) return null;

    // Check if statements are equivalent but have opposing truth values
    if (this._areEquivalentStatements(beliefA.statement, beliefB.statement)) {
      // Check for direct negation: one is true (high confidence), other is false (low confidence)
      if (this.config.detectDirectNegations && this._isDirectNegation(beliefA, beliefB)) {
        return {
          type: 'direct_negation',
          beliefs: [beliefA, beliefB],
          strength: 1.0,
          timestamp: Date.now(),
          confidence: 1.0
        };
      }

      // Check for partial contradiction: both have high confidence but opposing values
      if (this.config.detectPartialContradictions && this._isPartialContradiction(beliefA, beliefB)) {
        const strength = 1 - Math.abs(beliefA.truth.frequency - beliefB.truth.frequency);
        return {
          type: 'partial_contradiction',
          beliefs: [beliefA, beliefB],
          strength,
          timestamp: Date.now(),
          confidence: strength
        };
      }
    }

    return null;
  }

  /**
   * Check if two statements are equivalent
   * @private
   */
  _areEquivalentStatements(stmtA, stmtB) {
    if (!stmtA || !stmtB) return false;

    // For now, simple string comparison
    // In a more advanced implementation, this could involve semantic comparison
    return stmtA.toString() === stmtB.toString();
  }

  /**
   * Check if beliefs represent a direct negation
   * @private
   */
  _isDirectNegation(beliefA, beliefB) {
    // A direct negation occurs when:
    // - The same statement has truth values at opposite ends of the spectrum
    // - One is very confident (close to 1.0) and the other is very unconfident (close to 0.0)
    const freqA = beliefA.truth?.frequency || 0;
    const freqB = beliefB.truth?.frequency || 0;

    // Check if one is confident true and the other is confident false
    return (freqA > 0.9 && freqB < 0.1) || (freqA < 0.1 && freqB > 0.9);
  }

  /**
   * Check if beliefs represent a partial contradiction
   * @private
   */
  _isPartialContradiction(beliefA, beliefB) {
    // A partial contradiction occurs when:
    // - The same statement has conflicting truth values with high confidence
    const freqA = beliefA.truth?.frequency || 0;
    const freqB = beliefB.truth?.frequency || 0;
    const confA = beliefA.truth?.confidence || 0;
    const confB = beliefB.truth?.confidence || 0;

    // Both have high confidence but significantly different frequency values
    const diff = Math.abs(freqA - freqB);
    return (confA > 0.8 && confB > 0.8 && diff > this.config.threshold);
  }

  /**
   * Record detected contradiction
   * @private
   */
  _recordContradiction(contradiction) {
    const id = this._generateContradictionId(contradiction);

    this.contradictions.set(id, {
      ...contradiction,
      resolved: false,
      resolution: null
    });

    // Update statistics
    this.stats.contradictionsDetected++;
    if (contradiction.type === 'direct_negation') {
      this.stats.directNegations++;
    } else if (contradiction.type === 'partial_contradiction') {
      this.stats.partialContradictions++;
    }
  }

  /**
   * Generate unique contradiction ID
   * @private
   */
  _generateContradictionId(contradiction) {
    const stmt = contradiction.beliefs[0].statement || 'unknown';
    return `${stmt.toString()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Get all detected contradictions
   */
  getContradictions() {
    return Array.from(this.contradictions.values());
  }

  /**
   * Get unresolved contradictions
   */
  getUnresolvedContradictions() {
    return Array.from(this.contradictions.values())
      .filter(contradiction => !contradiction.resolved);
  }

  /**
   * Get contradiction statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalContradictions: this.contradictions.size,
      unresolvedContradictions: this.getUnresolvedContradictions().length
    };
  }

  /**
   * Clear all detected contradictions
   */
  clearContradictions() {
    this.contradictions.clear();
    // Reset stats but keep detection counts
    this.stats.resolvedContradictions = 0;
    this.stats.falsePositives = 0;
  }

  /**
   * Check if a specific belief is involved in any contradictions
   */
  isBeliefContradicted(belief) {
    for (const [, contradiction] of this.contradictions) {
      if (contradiction.beliefs.some(b => b.id === belief.id)) {
        return true;
      }
    }
    return false;
  }
}