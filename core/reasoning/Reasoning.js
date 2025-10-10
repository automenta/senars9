import Component from '../base/Component.js';
import { Logger, ArrayUtils } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';
import Rules from './Rules.js';

class Reasoning extends Component {
  constructor() {
    super();
    this.strategies = new Map();
    this.reasoningHistory = [];
    this.maxHistorySize = DEFAULTS.MAX_HISTORY_SIZE;
    this.rulesIntegration = null; // Will be set when core is available
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.strategies.clear();
    this.reasoningHistory = [];
    this.maxHistorySize = config.maxHistorySize ?? DEFAULTS.MAX_HISTORY_SIZE;

    // Initialize default inference rules - delay this until core is fully available
    // because the rules component might not be ready during initialization
    // The rules will be initialized after the core is set up in Core.js
  }
  
  async start() {
    // Initialize default inference rules after core is available
    this._initializeDefaultInferenceRules();
  }

  // Getter for accessing the rules component
  get rules() {
    return this.core?.rules || this.rulesIntegration;
  }

  addStrategy(strategy) {
    if (!strategy || !strategy.id) {
      throw new Error('Strategy must have an ID.');
    }
    this.strategies.set(strategy.id, strategy);
  }

  addInferenceRule(name, condition, action, options = {}) {
    // Check if the rules component is available
    if (this.rules) {
      // Add the rule to the Rules component for proper indexing and management
      this.rules.add({
        name: name,
        condition: condition,
        action: action,
        type: options.type || 'inference',
        priority: options.priority || 0,
        complexity: options.complexity || 'simple',
        preFilterTags: options.preFilterTags || []
      });
    } else {
      // If rules component isn't available yet, store for later initialization
      // This allows for deferred rule creation until the core is fully established
      if (!this.deferredRules) {
        this.deferredRules = [];
      }
      this.deferredRules.push({
        name: name,
        condition: condition,
        action: action,
        options: options
      });
    }
  }
  
  // Apply deferred rules once the rules component becomes available
  _applyDeferredRules() {
    if (!this.deferredRules || !this.rules) return;
    
    for (const ruleData of this.deferredRules) {
      this.rules.add({
        name: ruleData.name,
        condition: ruleData.condition,
        action: ruleData.action,
        type: ruleData.options.type || 'inference',
        priority: ruleData.options.priority || 0,
        complexity: ruleData.options.complexity || 'simple',
        preFilterTags: ruleData.options.preFilterTags || []
      });
    }
    
    this.deferredRules = [];
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
      // Check if we should use strategy registry, but avoid infinite recursion
      // If the context indicates we're already in a strategy execution, skip strategy selection
      if (this.strategyRegistry && this.systemContext && !context._inStrategyExecution) {
        try {
          // Attempt to select and execute a reasoning strategy
          const strategyName = await this._selectReasoningStrategy(tasks, reasoningContext);
          if (strategyName && this.strategyRegistry.getStrategy(strategyName)) {
            // Add flag to prevent infinite recursion if the strategy calls reason() again
            const strategyContext = {
              ...reasoningContext,
              _inStrategyExecution: true
            };
            
            const strategyResult = await this.strategyRegistry.executeStrategy(strategyName, tasks, strategyContext);
            return strategyResult;
          }
        } catch (strategyError) {
          Logger.warn(`Strategy-based reasoning failed, falling back to default: ${strategyError.message}`);
        }
      }

      // Default reasoning process (if strategy registry not available, in recursion, or strategy failed)
      // Phase 1: Pattern Recognition and Analysis
      const patterns = this._analyzePatterns(tasks, reasoningContext);

      // Phase 2: Inference Application using Rules component
      const inferences = await this._applyInferenceRulesWithRulesComponent(tasks, patterns, reasoningContext);

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
    // Add deduction rule to the Rules component
    this.addInferenceRule('deduction', 
      // Condition: Check if there are tasks with implications
      (context) => {
        const tasks = context.tasks || [];
        return tasks.some(task => task.punctuation === '.' && task.term?.includes(' --> '));
      },
      // Action: Generate deduction inferences
      (context) => {
        const inferences = [];
        const tasks = context.tasks || [];
        
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
      },
      {
        type: 'deduction',
        priority: 1,
        complexity: 'simple',
        preFilterTags: ['tasks']
      }
    );

    // Add induction rule to the Rules component
    this.addInferenceRule('induction',
      // Condition: Check if there are multiple similar tasks
      (context) => {
        const tasks = context.tasks || [];
        const patterns = new Map();
        
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
        
        // At least 2 tasks with the same pattern
        return Array.from(patterns.values()).some(tasks => tasks.length >= 2);
      },
      // Action: Generate inductive inferences
      (context) => {
        const inferences = [];
        const tasks = context.tasks || [];
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
      },
      {
        type: 'induction',
        priority: 0.5,
        complexity: 'simple',
        preFilterTags: ['tasks']
      }
    );

    // Add abduction rule to the Rules component
    this.addInferenceRule('abduction',
      // Condition: Check if there are question tasks
      (context) => {
        const tasks = context.tasks || [];
        return tasks.some(task => task.punctuation === '?' && task.term);
      },
      // Action: Generate hypotheses for questions
      (context) => {
        const tasks = context.tasks || [];
        const questionTasks = tasks.filter(task => task.punctuation === '?' && task.term);
        let allHypotheses = [];
        
        for (const task of questionTasks) {
          const hypotheses = this._generateHypotheses(task, tasks, context);
          allHypotheses.push(...hypotheses);
        }
        
        return allHypotheses;
      },
      {
        type: 'abduction',
        priority: 0.7,
        complexity: 'moderate',
        preFilterTags: ['tasks']
      }
    );
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

  async _applyInferenceRulesWithRulesComponent(tasks, patterns, reasoningContext) {
    if (!this.rules) {
      Logger.warn('Rules component not available, using fallback inference rules');
      // Fallback to original approach if rules component is not available
      return this._applyFallbackInferenceRules(tasks, patterns, reasoningContext);
    }

    // Apply any deferred rules that were waiting for the rules component
    this._applyDeferredRules();

    // Create a context with all necessary information for the rules
    const ruleContext = {
      tasks,
      patterns,
      reasoningContext,
      // Add other relevant data that rules might need
      timestamp: Date.now(),
      ...reasoningContext
    };

    try {
      // Use the Rules component to evaluate applicable inference rules
      const result = await this.rules.evaluate(ruleContext, {
        ruleType: 'inference'
      });

      if (Array.isArray(result)) {
        return result;
      }
      
      // If the result is not an array, try to get all applicable rules and apply them
      const candidates = this.rules.getOptimizedRuleCandidates(ruleContext, {
        ruleType: 'inference'
      });

      const allInferences = [];
      for (const rule of candidates) {
        if (rule.condition && rule.condition(ruleContext)) {
          try {
            const inferenceResult = await rule.action(ruleContext);
            if (Array.isArray(inferenceResult)) {
              allInferences.push(...inferenceResult);
            } else if (inferenceResult) {
              allInferences.push(inferenceResult);
            }
          } catch (error) {
            Logger.warn(`Rule '${rule.name}' action failed`, error);
          }
        }
      }
      
      return allInferences;
    } catch (error) {
      Logger.error('Error applying inference rules via Rules component', error);
      // Fallback to original approach
      return this._applyFallbackInferenceRules(tasks, patterns, reasoningContext);
    }
  }

  _applyFallbackInferenceRules(tasks, patterns, reasoningContext) {
    // This is a fallback implementation similar to the original method
    const inferences = [];
    Logger.warn('Using fallback inference rule application');
    
    // Apply simple rule evaluation without the full rules component
    for (const task of tasks) {
      if (task.punctuation === '.' && task.term?.includes(' --> ')) {
        // Deduction: If A -> B and A is true, then B is true
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

  async _selectReasoningStrategy(tasks, context) {
    // For now, return the default strategy name
    // In a more advanced implementation, this could analyze the incoming tasks
    // and context to select the most appropriate reasoning strategy
    
    // Basic strategy selection logic based on task characteristics
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      // Example: If tasks involve contradictions, we might select a contradiction-focused strategy
      // For now, just return the default reasoning strategy
      return 'basic_reasoning';
    }
    
    return 'basic_reasoning';
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
    const stats = {
      strategies: this.strategies.size,
      historySize: this.reasoningHistory.length,
      historyLimit: this.maxHistorySize,
      lastActivity: this.reasoningHistory.length > 0 ?
        this.reasoningHistory[this.reasoningHistory.length - 1].timestamp : null
    };

    // Add inference rules count for backward compatibility
    if (this.rules) {
      // Count rules that have type 'inference'
      const rulesStats = this.rules.getStats();
      stats.inferenceRules = 0;
      
      if (rulesStats.types && rulesStats.types.includes('inference')) {
        // Get rules by type to count them
        const inferenceRuleNames = this.rules.getRulesByType('inference');
        if (Array.isArray(inferenceRuleNames)) {
          stats.inferenceRules = inferenceRuleNames.length;
        } else {
          // If getRulesByType returns rules objects directly instead of names
          stats.inferenceRules = Array.isArray(inferenceRuleNames) ? inferenceRuleNames.length : 0;
        }
      }
      
      stats.rules = {
        total: rulesStats.totalRules,
        types: rulesStats.types,
        performance: rulesStats.performance
      };
    } else {
      // For backward compatibility when rules component isn't available yet
      stats.inferenceRules = 0;
    }

    return stats;
  }

  /**
   * Evaluate a specific rule with given tasks and context
   */
  async evaluateRule(ruleName, tasks, context = {}) {
    if (!this.rules) {
      throw new Error('Rules component not available. Initialize with core first.');
    }

    const reasoningContext = this._createReasoningContext(context);
    const ruleContext = {
      tasks,
      ...reasoningContext
    };

    return await this.rules.evaluate(ruleContext, {
      ruleType: 'inference'
    });
  }

  /**
   * Apply all applicable rules to a set of tasks and return inferences
   */
  async applyRulesToTasks(tasks, options = {}) {
    if (!this.rules) {
      Logger.warn('Rules component not available, skipping rule application');
      return [];
    }

    const reasoningContext = this._createReasoningContext(options);
    const ruleContext = {
      tasks,
      reasoningContext,
      timestamp: Date.now(),
      ...reasoningContext
    };

    // Apply any deferred rules that were waiting for the rules component
    this._applyDeferredRules();

    // Get all applicable inference rules
    const candidates = this.rules.getOptimizedRuleCandidates(ruleContext, {
      ruleType: 'inference',
      maxComplexity: options.maxComplexity
    });

    const allResults = [];
    for (const rule of candidates) {
      if (rule.condition && rule.condition(ruleContext)) {
        try {
          const result = await rule.action(ruleContext);
          if (result) {
            allResults.push({
              ruleName: rule.name,
              result,
              appliedAt: Date.now(),
              rulePriority: rule.priority
            });
          }
        } catch (error) {
          Logger.warn(`Rule '${rule.name}' application failed`, error);
        }
      }
    }

    // Sort by rule priority (higher first)
    allResults.sort((a, b) => (b.rulePriority || 0) - (a.rulePriority || 0));

    return allResults;
  }
}

export default Reasoning;