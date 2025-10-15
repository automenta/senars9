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
      metrics: {
        executions: 0,
        successes: 0,
        avgTime: 0,
        lastRun: null
      }
    });
  }

  canApply(context) { return true; }
  async apply(context) { throw new Error('apply must be implemented by subclasses'); }

  updateMetrics(success, time) {
    const m = this.metrics;
    m.executions++;
    if (success) m.successes++;
    m.avgTime = (m.avgTime * (m.executions - 1) + time) / m.executions;
    m.lastRun = Date.now();
  }

  getMetrics() { return { ...this.metrics }; }
}

export class LMRule extends Rule {
  constructor(id, lm, options = {}) {
    super(id, { ...options, type: 'lm' });
    this.lm = lm;
    this.promptTemplate = options.promptTemplate;
    this.lmStats = { tokens: 0, calls: 0, avgTime: 0 };
  }

  generatePrompt(context) {
    if (!this.promptTemplate) throw new Error(`No prompt template for rule ${this.id}`);
    return this.promptTemplate(context);
  }

  async executeLM(context) {
    if (!this.lm) throw new Error(`LM unavailable for rule ${this.id}`);

    const startTime = Date.now();
    const prompt = this.generatePrompt(context);
    const response = await this.lm.process(prompt);
    const time = Date.now() - startTime;

    this._updateLMStats(prompt.length + response.length, time);
    this.updateMetrics(true, time);
    return response;
  }

  // Backward compatibility method
  async executeLMProcessing(context) {
    return this.executeLM(context);
  }

  _updateLMStats(tokens, time) {
    const s = this.lmStats;
    s.calls++;
    s.tokens += tokens;
    s.avgTime = (s.avgTime * (s.calls - 1) + time) / s.calls;
  }

  async apply(context) { return this.executeLM(context); }
  getLMStats() { return { ...this.lmStats }; }
}

export class NALRule extends Rule {
  constructor(id, options = {}) {
    super(id, { ...options, type: 'nal' });
    this.truthFn = options.truthFn;
    this.inferenceFn = options.inferenceFn;
  }

  applyTruth(...args) {
    return this.truthFn ? this.truthFn(...args) : { frequency: 0.9, confidence: 0.8 };
  }

  async performInference(context) {
    if (!this.inferenceFn) throw new Error(`No inference function for rule ${this.id}`);
    return this.inferenceFn(context);
  }

  async apply(context) {
    const startTime = Date.now();
    try {
      const result = await this.performInference(context);
      this.updateMetrics(true, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      throw error;
    }
  }
}
