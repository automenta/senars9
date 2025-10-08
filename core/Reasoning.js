import Component from './Component.js';
import { Logger, ArrayUtils } from './utilities.js';
import { DEFAULTS } from './constants.js';

class Reasoning extends Component {
  constructor() {
    super();
    this.strategies = new Map();
    this.inferenceRules = new Map();
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.strategies.clear();
    this.inferenceRules.clear();
    this.reasoningHistory = [];
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;

    // Initialize default inference rules
    this._initializeDefaultInferenceRules();
  }

  addStrategy(strategy) {
    if (!strategy || !strategy.id) {
      throw new Error('Strategy must have an ID.');
    }
    this.strategies.set(strategy.id, strategy);
  }

  addInferenceRule(name, ruleFunction) {
    if (typeof ruleFunction !== 'function') {
      throw new Error('Inference rule must be a function');
    }
    this.inferenceRules.set(name, ruleFunction);
  }

  async reason(tasks, context = {}) {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      Logger.debug('No tasks provided to reason');
      return [];
    }

    const reasoningContext = this._createReasoningContext(context);
    const results = {
      derivedTasks: [],
      inferences: [],
      contradictions: [],
      timestamp: Date.now()
    };

    try {
      // Phase 1: Pattern Recognition and Analysis
      const patterns = this._analyzePatterns(tasks, reasoningContext);

      // Phase 2: Inference Application
      const inferences = this._applyInferenceRules(tasks, patterns, reasoningContext);

      // Phase 3: Contradiction Detection
      const contradictions = this._detectContradictions(inferences, reasoningContext);

      // Phase 4: Task Derivation
      const derivedTasks = this._deriveNewTasks(inferences, contradictions, reasoningContext);

      // Store results
      results.derivedTasks = derivedTasks;
      results.inferences = inferences;
      results.contradictions = contradictions;

      // Update reasoning history
      this._updateReasoningHistory(results);

      // Emit reasoning completion event if messaging is available
      if (this.core?.messages) {
        this.core.messages.emit('reasoning.completed', {
          inputTaskCount: tasks.length,
          derivedTaskCount: derivedTasks.length,
          inferenceCount: inferences.length,
          contradictionCount: contradictions.length,
          timestamp: results.timestamp
        });
      }

      return derivedTasks;

    } catch (error) {
      Logger.error('Error during reasoning', error);
      this.emit('reasoning_error', { error: error.message, context: reasoningContext });
      return [];
    }
  }

  _createReasoningContext(baseContext = {}) {
    return {
      timestamp: Date.now(),
      strategy: baseContext.strategy || 'default',
      depth: baseContext.depth ?? 1,
      maxDepth: baseContext.maxDepth ?? 5,
      confidence: baseContext.confidence ?? 0.8,
      ...baseContext
    };
  }

  _initializeDefaultInferenceRules() {
    // Deduction: If A -> B and A is true, then B is true
    this.addInferenceRule('deduction', (tasks, context) => {
      const inferences = [];

      for (const task of tasks) {
        if (task.punctuation === '.' && task.term?.includes(' --> ')) {
          // Parse implication: A --> B
          const parts = task.term.match(/\(([^)]+)\) --> \(([^)]+)\)/);
          if (parts) {
            const [, antecedent, consequent] = parts;
            inferences.push({
              type: 'deduction',
              premise: task.term,
              conclusion: `(${consequent}).`,
              confidence: task.truth?.frequency ?? 0.9,
              rule: 'implication'
            });
          }
        }
      }

      return inferences;
    });

    // Induction: Multiple similar observations suggest a pattern
    this.addInferenceRule('induction', (tasks, context) => {
      const inferences = [];
      const patterns = new Map();

      // Group tasks by similarity
      for (const task of tasks) {
        if (task.punctuation === '.' && task.term) {
          const key = this._extractPatternKey(task.term);
          if (key) {
            if (!patterns.has(key)) {
              patterns.set(key, []);
            }
            patterns.get(key).push(task);
          }
        }
      }

      // Generate inductive inferences for common patterns
      for (const [pattern, similarTasks] of patterns) {
        if (similarTasks.length >= 2) {
          const avgConfidence = similarTasks.reduce((sum, t) => sum + (t.truth?.frequency ?? 0.5), 0) / similarTasks.length;
          inferences.push({
            type: 'induction',
            pattern,
            observationCount: similarTasks.length,
            conclusion: `(${pattern}).`,
            confidence: Math.min(avgConfidence + 0.1, 0.95),
            rule: 'pattern_induction'
          });
        }
      }

      return inferences;
    });

    // Abduction: Find the best explanation for an observation
    this.addInferenceRule('abduction', (tasks, context) => {
      const inferences = [];

      for (const task of tasks) {
        if (task.punctuation === '?' && task.term) {
          // This is a question - find explanatory hypotheses
          const hypotheses = this._generateHypotheses(task, tasks, context);
          inferences.push(...hypotheses);
        }
      }

      return inferences;
    });
  }

  _analyzePatterns(tasks, context) {
    const patterns = {
      temporal: [],
      causal: [],
      structural: [],
      behavioral: []
    };

    for (const task of tasks) {
      if (task.punctuation === '.' && task.term) {
        // Temporal patterns
        if (task.term.includes(' --> ') || task.term.includes(' <-> ')) {
          patterns.temporal.push(task);
        }

        // Causal patterns
        if (task.term.includes(' ==> ') || task.term.includes(' <=> ')) {
          patterns.causal.push(task);
        }

        // Structural patterns
        if (task.term.includes(' {-- ') || task.term.includes(' --] ')) {
          patterns.structural.push(task);
        }

        // Behavioral patterns
        if (task.term.includes(' / ') || task.term.includes(' \\ ')) {
          patterns.behavioral.push(task);
        }
      }
    }

    return patterns;
  }

  _applyInferenceRules(tasks, patterns, context) {
    const inferences = [];

    for (const [ruleName, ruleFunction] of this.inferenceRules) {
      try {
        const ruleInferences = ruleFunction(tasks, patterns, context);
        if (Array.isArray(ruleInferences)) {
          inferences.push(...ruleInferences);
        }
      } catch (error) {
        Logger.warn(`Error applying inference rule ${ruleName}`, error);
      }
    }

    return inferences;
  }

  _detectContradictions(inferences, context) {
    const contradictions = [];

    // Simple contradiction detection: look for tasks with same term but different truth values
    const taskMap = new Map();

    for (const inference of inferences) {
      if (inference.conclusion) {
        const existing = taskMap.get(inference.conclusion);
        if (existing && Math.abs((existing.confidence ?? 0) - (inference.confidence ?? 0)) > 0.3) {
          contradictions.push({
            type: 'confidence_conflict',
            term: inference.conclusion,
            conflictingInferences: [existing, inference],
            severity: 'medium'
          });
        }
        taskMap.set(inference.conclusion, inference);
      }
    }

    return contradictions;
  }

  _deriveNewTasks(inferences, contradictions, context) {
    const derivedTasks = [];

    // Convert successful inferences to tasks
    for (const inference of inferences) {
      if (inference.confidence >= (context.confidence ?? 0.8)) {
        derivedTasks.push({
          term: inference.conclusion,
          punctuation: '.',
          truth: {
            frequency: inference.confidence,
            confidence: 0.8
          },
          priority: inference.priority ?? 0.5,
          timestamp: Date.now(),
          derivationPath: [`reasoning:${inference.type}`]
        });
      }
    }

    // Create tasks for contradiction resolution
    for (const contradiction of contradictions) {
      derivedTasks.push({
        term: `(${contradiction.term} --> resolve_conflict)`,
        punctuation: '!',
        truth: {
          frequency: 0.9,
          confidence: 0.9
        },
        priority: 0.8,
        timestamp: Date.now(),
        derivationPath: ['reasoning:contradiction_resolution']
      });
    }

    return derivedTasks;
  }

  _extractPatternKey(term) {
    // Extract the core pattern from a term for grouping similar observations
    if (!term) return '';
    return term.replace(/[()]/g, '').split(/\s+/)[0];
  }

  _generateHypotheses(questionTask, allTasks, context) {
    const hypotheses = [];

    // Simple hypothesis generation based on question patterns
    if (questionTask.term?.includes('why')) {
      // Generate explanatory hypotheses
      hypotheses.push({
        type: 'abduction',
        premise: questionTask.term,
        conclusion: '(explanation --> hypothesis).',
        confidence: 0.6,
        rule: 'explanation_hypothesis'
      });
    }

    // More hypothesis patterns could be added here
    return hypotheses;
  }

  _updateReasoningHistory(results) {
    this.reasoningHistory.push({
      timestamp: results.timestamp,
      inferenceCount: results.inferences.length,
      derivedTaskCount: results.derivedTasks.length,
      contradictionCount: results.contradictions.length
    });

    // Keep history size manageable
    if (this.reasoningHistory.length > this.maxHistorySize) {
      this.reasoningHistory = this.reasoningHistory.slice(-this.maxHistorySize);
    }
  }

  getReasoningHistory(limit = 100) {
    return this.reasoningHistory.slice(-limit);
  }

  getStats() {
    return {
      strategies: this.strategies.size,
      inferenceRules: this.inferenceRules.size,
      historySize: this.reasoningHistory.length,
      historyLimit: this.maxHistorySize,
      lastActivity: this.reasoningHistory.length > 0 ?
        this.reasoningHistory[this.reasoningHistory.length - 1].timestamp : null
    };
  }
}

export default Reasoning;