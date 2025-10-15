export class Rule {
  constructor(id, options = {}) {
    Object.assign(this, {
      id,
      name: options.name || id,
      description: options.description || '',
      priority: options.priority || 0.5,
      enabled: options.enabled !== false,
      type: options.type || 'general',
      parameters: options.parameters || {},
      performanceMetrics: {
        executionCount: 0,
        successCount: 0,
        avgExecutionTime: 0,
        lastExecuted: null
      }
    });
  }

  canApply(context) { return true; }

  async apply(context) {
    throw new Error('apply must be implemented by subclasses');
  }

  updatePerformance(success, executionTime) {
    const { performanceMetrics } = this;
    performanceMetrics.executionCount++;
    if (success) performanceMetrics.successCount++;

    const total = performanceMetrics.avgExecutionTime * (performanceMetrics.executionCount - 1) + executionTime;
    performanceMetrics.avgExecutionTime = total / performanceMetrics.executionCount;
    // This field should be updated with actual time from context when context is available
    // For now, leaving as is but in a full implementation this would come from context
    performanceMetrics.lastExecuted = Date.now();
  }

  getPerformanceStats() {
    return { ...this.performanceMetrics };
  }
}

export class LMRule extends Rule {
  constructor(id, lm, options = {}) {
    super(id, { ...options, type: 'lm' });
    Object.assign(this, {
      lm,
      lmPromptTemplate: options.lmPromptTemplate || null,
      lmMetrics: {
        tokenCount: 0,
        apiCalls: 0,
        avgResponseTime: 0
      }
    });
  }

  generatePrompt(context) {
    return this.lmPromptTemplate ? this.lmPromptTemplate(context) : (() => { throw new Error('No LM prompt template provided'); })();
  }

  async executeLMProcessing(context) {
    if (!this.lm) throw new Error(`LM not available for rule ${this.id}`);

    const startTime = Date.now();
    const prompt = this.generatePrompt(context);
    const lmResponse = await this.lm.process(prompt);
    const executionTime = Date.now() - startTime;

    const { lmMetrics } = this;
    lmMetrics.apiCalls++;
    lmMetrics.tokenCount += prompt.length + lmResponse.length;
    lmMetrics.avgResponseTime = (lmMetrics.avgResponseTime * (lmMetrics.apiCalls - 1) + executionTime) / lmMetrics.apiCalls;

    return lmResponse;
  }

  async apply(context) {
    return this.executeLMProcessing(context);
  }

  getLMMetrics() {
    return { ...this.lmMetrics };
  }
}

export class NALRule extends Rule {
  constructor(id, options = {}) {
    super(id, { ...options, type: 'nal' });
    Object.assign(this, {
      truthFunction: options.truthFunction || null,
      inferenceRule: options.inferenceRule || null
    });
  }

  applyTruthFunction(...args) {
    return this.truthFunction ? this.truthFunction(...args) : { frequency: 0.9, confidence: 0.8 };
  }

  async performInference(context) {
    return this.inferenceRule ? this.inferenceRule(context) : (() => { throw new Error('No NAL inference rule defined'); })();
  }

  async apply(context) {
    return this.performInference(context);
  }
}
