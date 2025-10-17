import path from 'path';
import Memory from './Memory.js';
import { Focus } from './Focus.js';
import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';
import { RuleManager as Reasoner } from './reasoning/RuleManager.js';
import { CycleContext } from './Cycle.js';
import { Logger } from './base/utilities.js';
import { HighResolutionClock } from './Clock.js';
import LM from './lm/LM.js';
import { loadRules, validateLoadedRules } from './reasoning/RuleLoader.js';
import { RuleFactory } from './reasoning/RuleFactory.js';

export class NAR {
  constructor(config = {}) {
    this._initialize(config);
    Logger.debug('NAR initialized with integrated memory and reasoning components');
  }

  async initialize() {
    await this._loadReasoningRules();
    return this;
  }

  // Simplified method to quickly setup with default LM provider
  async initializeWithDefaults(lmProvider = null, options = {}) {
    // Initialize the core system
    await this.initialize();
    
    // Use provided provider or create a default one (e.g., DummyProvider)
    if (lmProvider) {
      this.lm.registerProvider('default', lmProvider);
    } else {
      // Create a default provider (DummyProvider for testing)
      const DummyProvider = (await import('./lm/DummyProvider.js')).default;
      this.lm.registerProvider('default', new DummyProvider());
    }
    
    return this;
  }

  _initialize(config) {
    this.config = {
      cycleInterval: 100,
      ...config,
    };

    this.clock = new HighResolutionClock();
    this.focus = new Focus();
    this.memory = new Memory(this.focus);
    this.lm = new LM();
    this.reasoner = new Reasoner(this.lm);

    this.focus.createFocusSet('default');
    this.focus.setFocus('default');

    this._isRunning = false;
    this.cycleTimer = null;
    this.stats = { cycles: 0, inputTasks: 0, derivedTasks: 0, birthdate: null };
  }

  input(taskData) {
    const task = this._createTask(taskData);
    this.memory.addTask(task, this.clock.getTime());
    this.focus.addTaskToFocus(task, task.getPriority());
    this.stats.inputTasks++;
    Logger.debug(`Task input: ${task.toString()}`);
    return task;
  }

  // Convenience methods for different task types
  believe(content, truth = { frequency: 0.9, confidence: 0.9 }) {
    return this.input({
      term: typeof content === 'string' ? content : content.term,
      punctuation: Punctuation.BELIEF,
      truth: truth instanceof TruthValue ? truth : new TruthValue(truth.frequency, truth.confidence)
    });
  }

  want(content, truth = { frequency: 0.9, confidence: 0.9 }) {
    return this.input({
      term: typeof content === 'string' ? content : content.term,
      punctuation: Punctuation.GOAL,
      truth: truth instanceof TruthValue ? truth : new TruthValue(truth.frequency, truth.confidence)
    });
  }

  // Convenience method to quickly run reasoning on a task
  async think(taskContent) {
    const task = this.input(taskContent);
    await this.runCycle();
    return task;
  }

  // Run reasoning with a callback for results
  async thinkAndRespond(taskContent, options = {}) {
    const task = this.input(taskContent);
    const derivedTasks = await this.runCycle();

    if (options.returnDerived !== false) {
      return {
        input: task,
        derived: derivedTasks,
        tasks: this.getTasksByPriority()
      };
    }

    return { input: task, derived: derivedTasks };
  }

  _createTask(taskData) {
    const currentTime = this.clock.getTime();
    return typeof taskData === 'string'
      ? this._createTaskFromString(taskData, currentTime)
      : this._createTaskFromObject(taskData, currentTime);
  }

  _createTaskFromObject(taskData, currentTime) {
    return Task.createInput(
      typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term,
      taskData.punctuation || Punctuation.BELIEF,
      taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : new TruthValue(0.9, 0.9),
      currentTime,
      currentTime,
      taskData.priority || 0.5
    );
  }

  _createTaskFromString(taskStr, currentTime) {
    const { termStr, punctuation } = this._parseTaskString(taskStr);

    return Task.createInput(
      Term.newAtom(termStr.trim()),
      punctuation,
      new TruthValue(0.9, 0.9),
      currentTime,
      currentTime
    );
  }

  _parseTaskString(taskStr) {
    const isGoal = taskStr.endsWith('!');
    const isQuestion = taskStr.endsWith('?');
    let termStr = taskStr;
    let punctuation = Punctuation.BELIEF;

    if (isGoal) {
      termStr = taskStr.slice(0, -1);
      punctuation = Punctuation.GOAL;
    } else if (isQuestion) {
      termStr = taskStr.slice(0, -1);
      punctuation = Punctuation.QUESTION;
    } else if (taskStr.endsWith('.')) {
      termStr = taskStr.slice(0, -1);
    }

    return { termStr, punctuation };
  }

  ask(questionData) {
    return this.input(typeof questionData === 'string'
      ? { term: questionData, punctuation: Punctuation.QUESTION }
      : { ...questionData, punctuation: Punctuation.QUESTION });
  }

  getTasks() {
    return this.memory.getAllTasks();
  }

  getTasksByPriority() {
    return this.getTasks().sort((a, b) => b.getPriority() - a.getPriority());
  }

  getTasksByTime() {
    return this.getTasks().sort((a, b) => b.createdAt - a.createdAt);
  }

  _filterTasks(filterFn) {
    return this.getTasks().filter(filterFn);
  }

  _filterTasksByPunctuation(punctuation) {
    return this._filterTasks(task => task.punctuation === punctuation);
  }

  getBeliefs() {
    return this._filterTasksByPunctuation(Punctuation.BELIEF);
  }

  getGoals() {
    return this._filterTasksByPunctuation(Punctuation.GOAL);
  }

  getQuestions() {
    return this._filterTasksByPunctuation(Punctuation.QUESTION);
  }

  findTasksByTerm(termPattern) {
    return this.memory.getAllTasks().filter(task => {
      return task.term && task.term.name && task.term.name.includes(termPattern);
    });
  }

  getTaskByHash(taskHash) {
    return this.memory.getTask(taskHash);
  }

  removeTask(taskHash) {
    return this.memory.removeTask(taskHash);
  }

  async runCycle() {
    const currentTime = this.clock.getTime();
    const context = new CycleContext(currentTime);
    const focusItems = this.focus.getFocusItems();

    if (focusItems.length === 0) return [];

    const focusSet = focusItems.map(item => {
      const taskData = item[1];
      const task = taskData.task || taskData;
      task.setAccessedAt(context.currentTime);
      return task;
    });

    const derivedTasks = await this.reasoner.reason(focusSet, this.memory, context);

    derivedTasks.forEach(task => {
      this.memory.addTask(task, context.currentTime);
      this.stats.derivedTasks++;
    });

    this.memory.consolidate(context.currentTime);
    this.stats.cycles++;
    return derivedTasks;
  }

  start() {
    if (this._isRunning) {
      Logger.warn('NAR is already running');
      return;
    }

    this._isRunning = true;
    this.stats.birthdate = this.clock.getTime();

    const cycleFn = async () => {
      if (!this._isRunning) return;
      try {
        await this.runCycle();
      } catch (error) {
        Logger.error('Error in reasoning cycle:', error);
      }
      if (this._isRunning) {
        this.cycleTimer = setTimeout(cycleFn, this.config.cycleInterval);
      }
    };

    cycleFn();
    Logger.debug('NAR started continuous reasoning cycle');
  }

  stop() {
    if (!this._isRunning) {
      Logger.warn('NAR is not running');
      return;
    }

    this._isRunning = false;
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
    Logger.debug('NAR stopped continuous reasoning cycle');
  }

  // Safe async iteration through reasoning cycles with error handling
  async runCyclesSafe(count, options = {}) {
    const results = [];
    const { delayBetweenCycles = 0, onError = null } = options;
    
    for (let i = 0; i < count; i++) {
      try {
        const result = await this.runCycle();
        results.push(result);
        
        if (delayBetweenCycles > 0 && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCycles));
        }
      } catch (error) {
        Logger.error(`Error in reasoning cycle ${i + 1}:`, error);
        if (onError) {
          onError(error, i);
        } else {
          // Continue with next cycle by default
          results.push([]);
        }
      }
    }
    
    return results;
  }

  // Method to run reasoning with specific rule filtering
  async runCycleWithRules(ruleIds) {
    const originalEnabledIds = new Set(this.reasoner.enabledRuleIds);
    
    try {
      // Temporarily enable only the specified rules
      this.reasoner.enabledRuleIds.clear();
      ruleIds.forEach(id => {
        if (this.reasoner.rules.has(id)) {
          this.reasoner.enabledRuleIds.add(id);
        }
      });
      
      const result = await this.runCycle();
      
      return result;
    } finally {
      // Restore original enabled rule set
      this.reasoner.enabledRuleIds = originalEnabledIds;
    }
  }



  // Get the count of rules by type
  getRuleCounts() {
    const stats = this.reasoner.getStats();
    return stats.ruleTypeCounts;
  }

  // Get rules summary information
  getRulesSummary() {
    const stats = this.reasoner.getStats();
    return {
      total: stats.totalRules,
      enabled: stats.enabledRules,
      types: stats.ruleTypes,
      byType: stats.ruleTypeCounts,
      validated: stats.validatedRules
    };
  }

  getStats() {
    const memoryState = this.getMemoryState();
    const reasonerStats = this.reasoner.getStats();

    return {
      ...this.stats,
      taskCount: memoryState.totalTasks,
      conceptCount: memoryState.concepts,
      uptime: this.stats.birthdate ? this.clock.getTime() - this.stats.birthdate : 0,
      memoryState,
      reasonerStats,
      reasoningMetrics: this._getReasoningMetrics()
    };
  }

  _getReasoningMetrics() {
    const enabledRules = this.reasoner.getEnabledRules();
    const ruleTypeCounts = {};

    enabledRules.forEach(rule => {
      if (rule.type) {
        ruleTypeCounts[rule.type] = (ruleTypeCounts[rule.type] || 0) + 1;
      }
    });

    return {
      enabledRulesCount: enabledRules.length,
      ruleTypeDistribution: ruleTypeCounts,
      averageRulesPerCycle: this.stats.cycles > 0
        ? (this.stats.derivedTasks / this.stats.cycles).toFixed(2)
        : 0
    };
  }

  getDetailedReasoningReport() {
    const stats = this.getStats();
    const enabledRules = this.reasoner.getEnabledRules();

    return {
      ...stats,
      enabledRules: enabledRules.map(rule => ({
        id: rule.id,
        name: rule.name || rule.id,
        type: rule.type,
        priority: rule.priority,
        description: rule.description
      })),
      rulePerformance: this._getRulePerformanceReport()
    };
  }

  _getRulePerformanceReport() {
    const performance = this.reasoner.getStats().performance;
    const enabledRules = this.reasoner.getEnabledRules();

    return {
      ...performance,
      ruleDetails: enabledRules.map(rule => {
        const metrics = this.reasoner.performanceMetrics.get(rule.id);
        return metrics ? {
          id: rule.id,
          executions: metrics.executions,
          successes: metrics.successes,
          failures: metrics.failures,
          successRate: metrics.executions > 0
            ? ((metrics.successes / metrics.executions) * 100).toFixed(1) + '%'
            : '0%',
          avgTime: Math.round(metrics.avgTime * 100) / 100 + 'ms',
          lastError: metrics.lastError
        } : null;
      }).filter(Boolean)
    };
  }

  getMemoryState() {
    return {
        totalTasks: this.getTasks().length,
        beliefs: this.getBeliefs().length,
        goals: this.getGoals().length,
        questions: this.getQuestions().length,
        concepts: this.memory.conceptStorage.size,
        focusTasks: this.focus.getFocusItems().length,
        longTermTasks: this.memory.getAllTasks().size
      };
    }

  getHighestPriorityTask() {
    return this.getTasksByPriority()[0] || null;
  }

  getConcepts() {
    return Array.from(this.memory.conceptStorage.values());
  }

  getConceptByTerm(termName) {
    for (const [hash, concept] of this.memory.conceptStorage) {
      if (concept.term && concept.term.name === termName) {
        return concept;
      }
    }
    return null;
  }

  reset() {
    this._initialize(this.config);
    Logger.debug('NAR reset to initial state');
  }

  async _loadReasoningRules() {
    const [lmRules, nalRules] = await Promise.all([
      this._loadLMRules(),
      this._loadNALRules()
    ]);

    const allRules = [...lmRules.valid, ...nalRules.valid];
    const successfullyAdded = this._registerRules(allRules);

    Logger.info(`Loaded ${lmRules.all.length} LM rules and ${nalRules.all.length} NAL rules, with ${successfullyAdded} successfully registered`);

    if (nalRules.errors.length > 0) {
      Logger.error(`Failed to create ${nalRules.errors.length} NAL rules:`, nalRules.errors);
    }
  }

  async _loadLMRules() {
    const lmRuleDir = path.join(path.dirname(import.meta.url.replace('file://', '')), 'reasoning', 'lm', 'rules');
    const rules = await loadRules(lmRuleDir, { lm: this.lm });
    const validation = validateLoadedRules(rules);

    if (validation.invalidCount > 0) {
      Logger.warn(`LM rule validation issues: ${validation.invalidCount} invalid rules found`);
    }

    return { all: rules, valid: validation.valid };
  }

  async _loadNALRules() {
    const nalRuleTypes = RuleFactory.getAvailableNALRules();
    const rules = [];
    const errors = [];

    for (const type of nalRuleTypes) {
      try {
        rules.push(RuleFactory.createNALRule(type));
      } catch (error) {
        const errorInfo = { type, error: error.message };
        Logger.error(`Failed to create NAL rule of type ${type}:`, error.message);
        errors.push(errorInfo);
      }
    }

    const validation = validateLoadedRules(rules);
    if (validation.invalidCount > 0) {
      Logger.warn(`NAL rule validation issues: ${validation.invalidCount} invalid rules found`);
    }

    return { all: rules, valid: validation.valid, errors };
  }

  _registerRules(rules) {
    let count = 0;
    for (const rule of rules) {
      try {
        this.reasoner.addRule(rule);
        count++;
      } catch (error) {
        Logger.error(`Failed to add rule ${rule.id}:`, error.message);
      }
    }
    return count;
  }

  isRunning() {
    return this._isRunning;
  }

  // Rule management methods
  _logRuleAction(action, target) {
    Logger.debug(`${action} ${target}`);
  }

  enableRule(ruleId) {
    this.reasoner.enable(ruleId);
    this._logRuleAction('Enabled rule:', ruleId);
  }

  disableRule(ruleId) {
    this.reasoner.disable(ruleId);
    this._logRuleAction('Disabled rule:', ruleId);
  }

  enableRuleType(type) {
    this.reasoner.enable(`type:${type}`);
    this._logRuleAction('Enabled rule type:', type);
  }

  disableRuleType(type) {
    this.reasoner.disable(`type:${type}`);
    this._logRuleAction('Disabled rule type:', type);
  }

  getRulesByType(type) {
    return this.reasoner.getRulesByType(type);
  }

  validateAllRules() {
    return this.reasoner.validateAllRules();
  }

  // Advanced reasoning methods
  async runCycleWithTracing() {
    const currentTime = this.clock.getTime();
    const context = new CycleContext(currentTime);
    const focusItems = this.focus.getFocusItems();

    if (focusItems.length === 0) return { derivedTasks: [], trace: [] };

    const focusSet = focusItems.map(item => {
      const taskData = item[1];
      const task = taskData.task || taskData;
      task.setAccessedAt(context.currentTime);
      return task;
    });

    const trace = [];
    const originalReason = this.reasoner.reason.bind(this.reasoner);

    // Wrap the reason method to capture tracing information
    this.reasoner.reason = async function(focusSet, memory, context) {
      const derivedTasks = [];
      const enabledRules = this.getEnabledRules();

      for (const rule of enabledRules) {
        const ruleStartTime = Date.now();
        const ruleResults = [];

        for (const premise of focusSet) {
          try {
            const result = await rule.apply({ premise, memory, context });
            if (result && result.length > 0) {
              ruleResults.push(...result);
            }
          } catch (error) {
            trace.push({
              type: 'rule_error',
              ruleId: rule.id,
              error: error.message,
              timestamp: Date.now()
            });
          }
        }

        const ruleEndTime = Date.now();
        if (ruleResults.length > 0) {
          derivedTasks.push(...ruleResults);
          trace.push({
            type: 'rule_success',
            ruleId: rule.id,
            derivedCount: ruleResults.length,
            executionTime: ruleEndTime - ruleStartTime,
            timestamp: Date.now()
          });
        }
      }

      return derivedTasks;
    }.bind(this.reasoner);

    const derivedTasks = await this.reasoner.reason(focusSet, this.memory, context);

    derivedTasks.forEach(task => {
      this.memory.addTask(task, context.currentTime);
      this.stats.derivedTasks++;
    });

    this.memory.consolidate(context.currentTime);
    this.stats.cycles++;

    // Restore original reason method
    this.reasoner.reason = originalReason;

    return { derivedTasks, trace };
  }

  // Batch processing for improved performance
  async runCycles(count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const result = await this.runCycle();
      results.push(result);
    }
    return results;
  }
}