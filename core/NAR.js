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
import { loadRules } from './reasoning/RuleLoader.js';
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

  _initialize(config) {
    this.config = {
      cycleInterval: 100,
      ...config,
    };

    this.clock = this.config.clock || new HighResolutionClock();
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
    try {
      const task = this._createTask(taskData);
      this.memory.addTask(task, this.clock.getTime());
      this.focus.addTaskToFocus(task, task.getPriority());
      this.stats.inputTasks++;
      Logger.debug(`Task input: ${task.toString()}`);
      return task;
    } catch (error) {
      Logger.error('Error inputting task:', error);
      throw error;
    }
  }

  _createTask(taskData) {
    const currentTime = this.clock.getTime();
    if (typeof taskData === 'string') {
      const isGoal = taskData.endsWith('!');
      const isQuestion = taskData.endsWith('?');
      let termStr = taskData;
      let punctuation = Punctuation.BELIEF;

      if (isGoal) {
        termStr = taskData.slice(0, -1);
        punctuation = Punctuation.GOAL;
      } else if (isQuestion) {
        termStr = taskData.slice(0, -1);
        punctuation = Punctuation.QUESTION;
      } else if (taskData.endsWith('.')) {
        termStr = taskData.slice(0, -1);
      }

      return Task.createInput(
        Term.newAtom(termStr.trim()),
        punctuation,
        new TruthValue(0.9, 0.9),
        currentTime,
        currentTime
      );
    }

    return Task.createInput(
      typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term,
      taskData.punctuation || Punctuation.BELIEF,
      taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : new TruthValue(0.9, 0.9),
      currentTime,
      currentTime,
      taskData.priority || 0.5
    );
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
      this.cycleTimer = setTimeout(cycleFn, this.config.cycleInterval);
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
    // Load LM rules using the existing loader
    const lmRuleDir = path.join(path.dirname(import.meta.url.replace('file://', '')), 'reasoning', 'lm', 'rules');
    const lmRules = await loadRules(lmRuleDir, { lm: this.lm });

    // Load NAL rules using the factory
    const nalRuleTypes = RuleFactory.getAvailableNALRules();
    const nalRules = nalRuleTypes.map(type => RuleFactory.createNALRule(type));

    // Combine and register all rules
    const allRules = [...lmRules, ...nalRules];
    allRules.forEach(rule => this.reasoner.addRule(rule));

    Logger.info(`Loaded ${lmRules.length} LM rules and ${nalRules.length} NAL rules`);
  }

  isRunning() {
    return this._isRunning;
  }

  // Rule management methods
  enableRule(ruleId) {
    this.reasoner.enable(ruleId);
    Logger.debug(`Enabled rule: ${ruleId}`);
  }

  disableRule(ruleId) {
    this.reasoner.disable(ruleId);
    Logger.debug(`Disabled rule: ${ruleId}`);
  }

  enableRuleType(type) {
    this.reasoner.enable(`type:${type}`);
    Logger.debug(`Enabled rule type: ${type}`);
  }

  disableRuleType(type) {
    this.reasoner.disable(`type:${type}`);
    Logger.debug(`Disabled rule type: ${type}`);
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