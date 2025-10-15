/**
 * @file core/reasoning/Rule.js
 * @description Base Rule class for the unified reasoning system
 */

/**
 * Base class for all reasoning rules
 */
export class Rule {
  constructor(id, options = {}) {
    this.id = id;
    this.name = options.name || id;
    this.description = options.description || '';
    this.priority = options.priority || 0.5;
    this.enabled = options.enabled !== false; // Enabled by default
    this.type = options.type || 'general'; // 'lm', 'nal', etc.
    this.parameters = options.parameters || {};
    this.performanceMetrics = {
      executionCount: 0,
      successCount: 0,
      avgExecutionTime: 0,
      lastExecuted: null
    };
  }

  /**
   * Determines if the rule can be applied to the given context
   * @param {object} context - The reasoning context
   * @returns {boolean} Whether the rule can be applied
   */
  canApply(context) {
    throw new Error('canApply must be implemented by subclasses');
  }

  /**
   * Applies the rule to the context and returns results
   * @param {object} context - The reasoning context
   * @returns {Promise<any>} Results from rule application
   */
  async apply(context) {
    throw new Error('apply must be implemented by subclasses');
  }

  /**
   * Updates performance metrics after rule execution
   * @param {boolean} success - Whether the rule execution was successful
   * @param {number} executionTime - Execution time in milliseconds
   */
  updatePerformance(success, executionTime) {
    this.performanceMetrics.executionCount++;
    if (success) this.performanceMetrics.successCount++;
    
    // Update average execution time
    const total = this.performanceMetrics.avgExecutionTime * (this.performanceMetrics.executionCount - 1) + executionTime;
    this.performanceMetrics.avgExecutionTime = total / this.performanceMetrics.executionCount;
    this.performanceMetrics.lastExecuted = Date.now();
  }

  /**
   * Gets the rule's performance statistics
   * @returns {object} Performance metrics
   */
  getPerformanceStats() {
    return { ...this.performanceMetrics };
  }
}

/**
 * Base class for LM reasoning rules
 */
export class LMRule extends Rule {
  constructor(id, lm, options = {}) {
    super(id, { ...options, type: 'lm' });
    this.lm = lm; // Language model instance
    this.lmPromptTemplate = options.lmPromptTemplate || null;
    
    // Additional LM-specific metrics
    this.lmMetrics = {
      tokenCount: 0,
      apiCalls: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Generates a prompt for the language model based on the context
   * @param {object} context - The reasoning context
   * @returns {string} The generated prompt
   */
  generatePrompt(context) {
    if (this.lmPromptTemplate) {
      return this.lmPromptTemplate(context);
    }
    throw new Error('No LM prompt template provided');
  }

  /**
   * Executes the LM-based processing pipeline
   * @param {object} context - The reasoning context
   * @returns {Promise<any>} Results from LM processing
   */
  async executeLMProcessing(context) {
    if (!this.lm) {
      throw new Error(`LM not available for rule ${this.id}`);
    }

    try {
      const startTime = Date.now();
      const prompt = this.generatePrompt(context);
      const lmResponse = await this.lm.process(prompt);
      const executionTime = Date.now() - startTime;
      
      // Update LM-specific metrics
      this.lmMetrics.apiCalls++;
      this.lmMetrics.tokenCount += prompt.length + lmResponse.length;
      const total = this.lmMetrics.avgResponseTime * (this.lmMetrics.apiCalls - 1) + executionTime;
      this.lmMetrics.avgResponseTime = total / this.lmMetrics.apiCalls;

      return lmResponse;
    } catch (error) {
      console.error(`Error in LM processing for rule ${this.id}:`, error);
      return null;
    }
  }

  async apply(context) {
    return this.executeLMProcessing(context);
  }

  // Get LM-specific metrics
  getLMMetrics() {
    return { ...this.lmMetrics };
  }
}

/**
 * Base class for NAL (Non-Axiomatic Logic) rules
 */
export class NALRule extends Rule {
  constructor(id, options = {}) {
    super(id, { ...options, type: 'nal' });
    
    // NAL-specific properties
    this.truthFunction = options.truthFunction || null;
    this.inferenceRule = options.inferenceRule || null;
  }

  /**
   * Applies NAL truth-value calculations
   * @param {...any} args - Arguments for the truth function
   * @returns {object} Truth value result
   */
  applyTruthFunction(...args) {
    if (this.truthFunction) {
      return this.truthFunction(...args);
    }
    // Default truth function that returns a basic truth value
    return { frequency: 0.9, confidence: 0.8 };
  }

  /**
   * Performs NAL inference based on the rule
   * @param {object} context - The reasoning context
   * @returns {Promise<any>} Inference results
   */
  async performInference(context) {
    if (this.inferenceRule) {
      return this.inferenceRule(context);
    }
    throw new Error('No NAL inference rule defined');
  }

  async apply(context) {
    return this.performInference(context);
  }
}