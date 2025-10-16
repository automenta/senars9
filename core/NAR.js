import path from 'path';
import Memory from './Memory.js';
import { Focus } from './Focus.js';
import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';
import { Reasoner } from './reasoning/Reasoner.js';
console.log('Reasoner imported in NAR.js:', Reasoner);
import { CycleContext } from './Cycle.js';
import { Logger } from './base/utilities.js';
import { HighResolutionClock } from './Clock.js';
import LM from './lm/LM.js';

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
    this.reasoner = new Reasoner({ lm: this.lm });

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

    if (derivedTasks) {
      derivedTasks.forEach(task => {
        this.memory.addTask(task, context.currentTime);
        this.stats.derivedTasks++;
      });
    }

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
    return {
      ...this.stats,
      taskCount: memoryState.totalTasks,
      conceptCount: memoryState.concepts,
      uptime: this.stats.birthdate ? this.clock.getTime() - this.stats.birthdate : 0,
      memoryState
    };
  }

  getMemoryState() {
    return {
       totalTasks: this.getTasks().length,
       beliefs: this.getBeliefs().length,
       goals: this.getGoals().length,
       questions: this.getQuestions().length,
       concepts: this.memory.conceptStorage.size,
       shortTermTasks: this.memory.shortTermTasks.size,
       longTermTasks: this.memory.longTermTasks.size
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
    const baseDir = path.dirname(import.meta.url.replace('file://', ''));
    const nalRuleDir = path.join(baseDir, 'reasoning', 'nal');
    const lmRuleDir = path.join(baseDir, 'reasoning', 'lm', 'rules');

    await this.reasoner.loadRulesFrom(nalRuleDir);
    await this.reasoner.loadRulesFrom(lmRuleDir);
  }

  isRunning() {
    return this._isRunning;
  }
}