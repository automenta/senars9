/**
 * @file core/reasoning/Rule.js
 * @description Base classes for reasoning rules, including general, LM-based, and NAL-based rules.
 */

import { Logger }from '../base/utilities.js';

/**
 * Base class for all reasoning rules.
 */
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
        failures: 0,
        avgTime: 0,
        lastRun: null
      }
    });
  }

  canApply(context) {
    return true;
  }

  async apply(context) {
    throw new Error('apply must be implemented by subclasses');
  }

  updateMetrics(success, time) {
    const m = this.metrics;
    m.executions++;
    if (success) {
      m.successes++;
    } else {
      m.failures++;
    }
    m.avgTime = (m.avgTime * (m.executions - 1) + time) / m.executions;
    m.lastRun = Date.now();
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

/**
 * An LM-based reasoning rule that interacts with a Language Model.
 * This class is designed to be highly configurable and declarative,
 * allowing for the easy creation of new rules with minimal boilerplate.
 */
export class LMRule extends Rule {
  constructor(id, lm, config = {}) {
    super(id, { ...config, type: 'lm' });
    this.lm = lm;
    this.config = {
      // Default condition: always true if an LM is available
      condition: (context) => !!this.lm,
      // Default prompt: throws an error if not overridden
      prompt: (context) => { throw new Error(`Prompt generation not implemented for rule: ${this.id}`); },
      // Default process: returns the raw LM output
      process: (lmResponse, context) => lmResponse,
      // Default generate: returns an empty array
      generate: (processedOutput, context) => [],
      // Default LM options
      lm_options: {
        temperature: 0.7,
        max_tokens: 1000,
      },
      ...config,
    };
    this.lmStats = { tokens: 0, calls: 0, avgTime: 0 };
  }

  canApply(context) {
    return this.config.condition(context);
  }

  generatePrompt(context) {
    return this.config.prompt(context);
  }

  processLMOutput(lmResponse, context) {
    return this.config.process(lmResponse, context);
  }

  generateTasks(processedOutput, context) {
    return this.config.generate(processedOutput, context);
  }

  async apply(context) {
    const startTime = Date.now();
    try {
      if (!this.canApply(context)) {
        this.updateMetrics(false, Date.now() - startTime);
        return [];
      }

      const prompt = this.generatePrompt(context);
      const lmResponse = await this.executeLM(prompt);

      if (!lmResponse) {
        this.updateMetrics(false, Date.now() - startTime);
        return [];
      }

      const processedOutput = this.processLMOutput(lmResponse, context);
      const newTasks = this.generateTasks(processedOutput, context);

      this.updateMetrics(true, Date.now() - startTime);
      return newTasks;
    } catch (error) {
      Logger.error(`Error in LMRule ${this.id}:`, { error, context });
      this.updateMetrics(false, Date.now() - startTime);
      return []; // Return empty array on error to prevent cascading failures
    }
  }

  async executeLM(prompt) {
    if (!this.lm) {
      throw new Error(`LM unavailable for rule ${this.id}`);
    }

    const startTime = Date.now();
    const response = await this.lm.process(prompt, this.config.lm_options);
    const time = Date.now() - startTime;

    this._updateLMStats(prompt.length + (response?.length || 0), time);
    return response;
  }

  _updateLMStats(tokens, time) {
    const s = this.lmStats;
    s.calls++;
    s.tokens += tokens;
    s.avgTime = (s.avgTime * (s.calls - 1) + time) / s.calls;
  }

  getLMStats() {
    return { ...this.lmStats };
  }
}

/**
 * A NAL-based reasoning rule that performs logical inference.
 */
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
    if (!this.inferenceFn) {
      throw new Error(`No inference function for rule ${this.id}`);
    }
    return this.inferenceFn(context);
  }

  async apply(context) {
    const startTime = Date.now();
    try {
      const result = await this.performInference(context);
      this.updateMetrics(true, Date.now() - startTime);
      return result;
    } catch (error) {
      Logger.error(`Error in NALRule ${this.id}:`, { error, context });
      this.updateMetrics(false, Date.now() - startTime);
      throw error;
    }
  }
}