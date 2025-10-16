import { glob } from 'glob';
import path from 'path';
import Memory from './Memory.js';
import { Focus } from './Focus.js';
import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';
import { Reasoner } from './Reasoner.js';
import { CycleContext, runSingleCycle } from './Cycle.js';
import { Logger, ObjectUtils } from './base/utilities.js';
import { Clock, HighResolutionClock } from './Clock.js';
import LM from './lm/LM.js';

export class NAR {
  constructor(config = {}) {
    this._initComponents(config);
    this._initState(config);
    Logger.debug('NAR initialized with integrated memory and reasoning components');
  }

  async initialize() {
    await this._initializeLMRules();
    return this;
  }

  _initComponents(config) {
    this.focus = new Focus();
    this.memory = new Memory(this.focus);
    this.lm = new LM();
    this.reasoner = new Reasoner(this.lm);
    
    // Initialize clock - use provided clock or default to HighResolutionClock
    this.clock = config.clock || new HighResolutionClock();

    // Create a default focus set
    this.focus.createFocusSet('default');
    this.focus.setFocus('default');
  }

  _initState(config) {
    this.config = config;
    this._isRunning = false;
    this.cycleInterval = config.cycleInterval || 100;
    this.cycleTimer = null;
    this.stats = { cycles: 0, inputTasks: 0, derivedTasks: 0, birthdate: null };
  }

  input(taskData) {
    try {
      let task;
      
      if (typeof taskData === 'string') {
        const isGoal = taskData.endsWith('!');
        const isQuestion = taskData.endsWith('?');
        const isBelief = !isGoal && !isQuestion;

        let term, punctuation;
        [term, punctuation] = isGoal
          ? [taskData.slice(0, -1), Punctuation.GOAL]
          : isQuestion
          ? [taskData.slice(0, -1), Punctuation.QUESTION]
          : [taskData.endsWith('.') ? taskData.slice(0, -1) : taskData, Punctuation.BELIEF];

        term = term.trim();
        
        const currentTime = this.clock.getTime();
        task = Task.createInput(
          Term.newAtom(term),
          punctuation,
          new TruthValue(0.9, 0.9), // default truth
          currentTime,
          currentTime
        );
      } else {
        const currentTime = this.clock.getTime();
        task = Task.createInput(
          typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term,
          taskData.punctuation || Punctuation.BELIEF,
          taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : new TruthValue(0.9, 0.9),
          currentTime,
          currentTime,
          taskData.priority || 0.5
        );
      }
      
      if (!task) {
        task = { createdAt: this.clock.getTime() };
      }
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

  _filterTasksByPunctuation(punctuation) {
    return this.getTasks().filter(task => task.punctuation === punctuation);
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

    // Get tasks from the focus set
    const focusItems = this.focus.getFocusItems();
    if (focusItems.length === 0) return [];

    // Extract the tasks from the [key, taskData] pairs
    // Handle both new format (task directly) and legacy format ({ task, ...metadata })
    const focusSet = focusItems.map(item => {
      const taskData = item[1];
      return taskData.task || taskData; // Return task if wrapped, otherwise return directly
    });

    focusSet.forEach(task => {
      /*if (!task.setAccessedAt)
        console.log(typeof(task), JSON.stringify(task,null,null));*/

      task.setAccessedAt(context.currentTime)
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
    if (this._isRunning) return Logger.warn('NAR is already running');

    this._isRunning = true;
    this.stats.birthdate = this.clock.getTime();
    
    const runCycle = () => {
      if (this._isRunning) {
        try {
          this.runCycle();
        } catch (error) {
          Logger.error('Error in reasoning cycle:', error);
        }
        this.cycleTimer = setTimeout(runCycle, this.cycleInterval);
      }
    };

    runCycle();
    Logger.debug('NAR started continuous reasoning cycle');
  }

  stop() {
    if (!this._isRunning) return Logger.warn('NAR is not running');

    this._isRunning = false;
    this.cycleTimer && (clearTimeout(this.cycleTimer), this.cycleTimer = null);
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
    this._initComponents(this.config);
    this._initState(this.config);
    Logger.debug('NAR reset to initial state');
  }
  
  async _initializeLMRules() {
    const rulePath = path.join(path.dirname(import.meta.url.replace('file://', '')), 'reasoning', 'lm', 'rules');
    Logger.info(`Searching for LM rules in: ${rulePath}`);
    const ruleFiles = await glob(`${rulePath}/*.js`);
    Logger.info(`Found rule files: ${ruleFiles.map(f => path.basename(f)).join(', ')}`);

    for (const file of ruleFiles) {
      if (file.endsWith('RuleHelpers.js')) continue;

      try {
        const module = await import(file);
        const createRuleFn = Object.values(module).find(v => typeof v === 'function' && v.name.startsWith('create'));

        if (createRuleFn) {
          const rule = createRuleFn(this.lm);
          this.reasoner.addRule(rule);
          Logger.info(`Successfully loaded and registered LM rule: ${rule.id}`);
        } else {
          Logger.warn(`No create function found in rule file: ${file}`);
        }
      } catch (error) {
        Logger.error(`Failed to load LM rule from ${file}:`, { error });
      }
    }
  }

  isRunning() {
    return this._isRunning;
  }
}