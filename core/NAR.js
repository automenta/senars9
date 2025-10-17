import path from 'path';
import Memory from './Memory.js';
import { Focus } from './Focus.js';
import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';
import { Reasoner } from './Reasoner.js';
import { CycleContext } from './Cycle.js';
import { Logger } from './base/utilities.js';
import { HighResolutionClock } from './Clock.js';
import LM from './lm/LM.js';
import { loadRules, validateLoadedRules } from './reasoning/RuleLoader.js';
import { RuleFactory } from './reasoning/RuleFactory.js';
import { Statistics } from './Statistics.js';

export class NAR {
  constructor(config = {}) {
    this._initialize(config);
    this.statistics = new Statistics(this);
    Logger.debug('NAR initialized with integrated memory and reasoning components');
  }

  async initialize() {
    await this.reasoner.initialize({
      lm: this.lm,
      rulePath: path.join(path.dirname(import.meta.url.replace('file://', '')), 'reasoning')
    });
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

  ask(content) {
    return this.input(typeof content === 'string'
      ? { term: content, punctuation: Punctuation.QUESTION }
      : { ...content, punctuation: Punctuation.QUESTION });
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
    let term, punctuation, truth, priority;

    if (typeof taskData === 'string') {
        let termStr = taskData.trim();
        punctuation = Punctuation.BELIEF; // Default

        if (termStr.endsWith('!')) {
            termStr = termStr.slice(0, -1);
            punctuation = Punctuation.GOAL;
        } else if (termStr.endsWith('?')) {
            termStr = termStr.slice(0, -1);
            punctuation = Punctuation.QUESTION;
        } else if (termStr.endsWith('.')) {
            termStr = termStr.slice(0, -1);
        }

        term = Term.newAtom(termStr);
        truth = new TruthValue(0.9, 0.9);
        priority = 0.5;
    } else {
        term = typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term;
        punctuation = taskData.punctuation || Punctuation.BELIEF;
        truth = taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : new TruthValue(0.9, 0.9);
        priority = taskData.priority || 0.5;
    }

    return Task.createInput(term, punctuation, truth, currentTime, currentTime, priority);
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
        // Continue running even if a cycle fails
      }
      if (this._isRunning) { // Check again before scheduling next cycle
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
    return this.statistics.getStats();
  }

  getDetailedReasoningReport() {
    return this.statistics.getDetailedReasoningReport();
  }

  getMemoryState() {
    return this.statistics.getMemoryState();
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
    const { derivedTasks, trace } = await this.reasoner.reasonWithTrace(
        this.focus.getFocusItems().map(item => {
            const taskData = item[1];
            const task = taskData.task || taskData;
            task.setAccessedAt(this.clock.getTime());
            return task;
        }),
        this.memory,
        new CycleContext(this.clock.getTime())
    );

    derivedTasks.forEach(task => {
        this.memory.addTask(task, this.clock.getTime());
        this.stats.derivedTasks++;
    });

    this.memory.consolidate(this.clock.getTime());
    this.stats.cycles++;

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