import { Term } from './Term.js';
import { TaskTable, SelectionCriteria, DefaultAggregationFunctions } from './TaskTable.js';
import { Punctuation } from './Task.js';

export class Concept {
  constructor(term, createdAt, activationLevel = 0.0, accessedAt = null) {
    this.term = term;
    this.createdAt = createdAt;
    this.accessedAt = accessedAt || createdAt;
    this.activationLevel = activationLevel;
    this.triggers = new Set();
    this.derivations = new Set();
    this.beliefTable = new TaskTable(1000); // Default capacity of 1000 beliefs
    this.goalTable = new TaskTable(100);   // Default capacity of 100 goals
    this.questionTable = new TaskTable(50); // Default capacity of 50 questions
    this.resources = new Map();
  }

  static create(term, createdAt, activationLevel = 0.0) {
    return new Concept(term, createdAt, activationLevel);
  }

  setActivationLevel(newLevel) {
    this.activationLevel = Math.max(0.0, Math.min(1.0, newLevel));
  }

  getActivationLevel() {
    return this.activationLevel;
  }

  setAccessedAt(time) {
    this.accessedAt = time;
  }

  getAccessedAt() {
    return this.accessedAt;
  }

  addTrigger(term) {
    this.triggers.add(term);
  }

  addDerivation(term) {
    this.derivations.add(term);
  }

  addTask(task) {
    const table = this._getTableForPunctuation(task.punctuation);
    table.addTask(task);
  }

  _getTableForPunctuation(punctuation) {
    switch (punctuation) {
      case Punctuation.BELIEF: return this.beliefTable;
      case Punctuation.GOAL: return this.goalTable;
      case Punctuation.QUESTION: return this.questionTable;
      default: throw new Error(`Unknown punctuation: ${punctuation}`);
    }
  }

  tasks(punctuation = Punctuation.BELIEF, time = Infinity, selectionCriteria = null, limit = 1) {
    const table = this._getTableForPunctuation(punctuation);
    return table.queryTasks(punctuation, time, selectionCriteria, limit);
  }

  static truth(tasks, aggregationFunction = DefaultAggregationFunctions.weighted) {
    return tasks.length > 0 && tasks[0].isQuestion() ? null : aggregationFunction(tasks);
  }

  truth(punctuation = Punctuation.BELIEF, time = Infinity, selectionCriteria = null, limit = 1, aggregationFunction = DefaultAggregationFunctions.weighted) {
    const tasks = this.tasks(punctuation, time, selectionCriteria, limit);
    return Concept.truth(tasks, aggregationFunction);
  }

  addResource(key, value) {
    this.resources.set(key, value);
  }

  getResource(key) {
    return this.resources.get(key);
  }

  toString() {
    return `[Concept: ${this.term.toString()}, activation=${this.activationLevel.toFixed(2)}, accessed=${this.accessedAt}]`;
  }

  equals(other) {
    return other instanceof Concept && this.term.equals(other.term);
  }
}