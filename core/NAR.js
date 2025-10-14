import Memory from './Memory.js';
import { Task, Punctuation, TruthValue } from './Task.js';
import { Term } from './Term.js';
import { Reasoner } from './Reasoner.js';
import { CycleContext, runSingleCycle } from './Cycle.js';
import { FocusSetSelector } from './FocusSetSelector.js';
import { Logger } from './base/utilities.js';

export class NAR {
  constructor(config = {}) {
    this._initComponents(config);
    this._initState(config);
    Logger.debug('NAR initialized with integrated memory and reasoning components');
  }

  _initComponents(config) {
    this.memory = new Memory();
    this.reasoner = new Reasoner();
    this.focusSetSelector = new FocusSetSelector(
      config.focusSize || 5,
      config.priorityThreshold || 0.1,
      config.urgencyWeight || 0.2,
      config.diversityFactor || 0.1
    );
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

        [term, punctuation] = isGoal
          ? [taskData.slice(0, -1), Punctuation.GOAL]
          : isQuestion
          ? [taskData.slice(0, -1), Punctuation.QUESTION]
          : [taskData.endsWith('.') ? taskData.slice(0, -1) : taskData, Punctuation.BELIEF];

        term = term.trim();
        
        task = Task.createInput(
          Term.newAtom(term),
          punctuation,
          new TruthValue(0.9, 0.9), // default truth
          Date.now(),
          Date.now()
        );
      } else {
        task = Task.createInput(
          typeof taskData.term === 'string' ? Term.newAtom(taskData.term) : taskData.term,
          taskData.punctuation || Punctuation.BELIEF,
          taskData.truth ? new TruthValue(taskData.truth.frequency, taskData.truth.confidence) : new TruthValue(0.9, 0.9),
          Date.now(),
          Date.now(),
          taskData.priority || 0.5
        );
      }
      
      this.memory.addTask(task, Date.now());
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

  runCycle() {
    const context = new CycleContext(Date.now());

    const allTasks = this.memory.getAllTasks();
    if (allTasks.length === 0) return;

    const focusSet = this.focusSetSelector.select(allTasks, context.currentTime);
    if (focusSet.length === 0) return;

    focusSet.forEach(task => task.setAccessedAt(context.currentTime));

    const derivedTasks = this.reasoner.reason(focusSet, this.memory, context);

    derivedTasks.forEach(task => {
      this.memory.addTask(task, context.currentTime);
      this.stats.derivedTasks++;
    });

    this.memory.consolidate(context.currentTime);
    this.stats.cycles++;
  }

  start() {
    if (this._isRunning) return Logger.warn('NAR is already running');

    this._isRunning = true;
    this.stats.birthdate = Date.now();
    
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
      uptime: this.stats.birthdate ? Date.now() - this.stats.birthdate : 0,
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
  
  isRunning() {
    return this._isRunning;
  }
}