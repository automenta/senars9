/**
 * @file tests/reasoning/TestNAR.js
 * @description NAR extension for declarative, isolated testing functionality.
 */

import { NAR } from '../../core/NAR.js';
import { Task, Punctuation, TruthValue } from '../../core/Task.js';
import { Term, TermType } from '../../core/Term.js';

/**
 * Fluent builder for creating detailed task matchers.
 */
export class TaskMatch {
  constructor(term) {
    this.conditions = [];
    if (term) {
      if (term instanceof RegExp) {
        this.conditions.push(task => term.test(task.term.toString()));
      } else {
        // Use exact match for non-RegExp terms
        this.conditions.push(task => task.term.toString() === term);
      }
    }
  }

  withPunctuation(punctuation) {
    this.conditions.push(task => task.punctuation === punctuation);
    return this;
  }

  withTruth(minFrequency, minConfidence) {
    this.conditions.push(task =>
      task.truth.frequency >= minFrequency &&
      task.truth.confidence >= minConfidence
    );
    return this;
  }

  build() {
    return task => this.conditions.every(condition => condition(task));
  }

  // Check that the task occurred after a specific time
  after(time) {
    this.conditions.push(task => task.occurrenceTime > time);
    return this;
  }

  // Check that the task occurred before a specific time
  before(time) {
    this.conditions.push(task => task.occurrenceTime < time);
    return this;
  }
}

/**
 * A NAR extension that provides a fluent API for writing declarative, isolated reasoning tests.
 */
export class TestNAR {
  constructor() {
    this.operations = [];
    this.rules = new Set();
    this.nar = null; // Will hold the isolated NAR instance
    this.inputTaskHashes = new Set(); // Track input tasks
  }


  // Add an input task to the NAR
  input(termStr, freq = 0.9, conf = 0.9) {
    this.operations.push({ type: 'input', termStr, freq, conf });
    return this;
  }

  // Run the NAR's reasoning cycle
  run(cycles = 1) {
    this.operations.push({ type: 'run', cycles });
    return this;
  }

  // Add an expectation to be checked
  expect(criteria) {
    const matcher = (criteria instanceof TaskMatch) ? criteria.build() : this._createMatcher(criteria);
    this.operations.push({ type: 'expect', matcher, criteria, shouldExist: true });
    return this;
  }

  // Add a negative expectation to be checked
  expectNot(criteria) {
    const matcher = (criteria instanceof TaskMatch) ? criteria.build() : this._createMatcher(criteria);
    this.operations.push({ type: 'expect', matcher, criteria, shouldExist: false });
    return this;
  }

  /**
   * Executes the entire test pipeline.
   */
  using(...ruleClasses) {
    for (const ruleClass of ruleClasses) {
      this.rules.add(ruleClass);
    }
    return this;
  }

  configure(callback) {
    this.configureCallback = callback;
    return this;
  }

  async execute() {
    this.nar = new NAR();
    await this.nar.initialize();

    if (this.configureCallback) {
      this.configureCallback(this.nar);
    }

    if (this.rules.size > 0) {
      this.nar.reasoner.disableAllRules();
      for (const rule of this.nar.reasoner.rules.values()) {
        for (const testRule of this.rules) {
          if (rule instanceof testRule) {
            this.nar.reasoner.enable(rule.id);
          }
        }
      }
    }

    const expectations = [];
    for (const op of this.operations) {
      switch (op.type) {
        case 'input': {
          const task = this._createTaskFromString(op.termStr, Punctuation.BELIEF, op.freq, op.conf);
          this.inputTaskHashes.add(task.term.hash); // Record input hash
          this.nar.input(task);
          break;
        }
        case 'run':
          for (let i = 0; i < op.cycles; i++) {
            await this.nar.runCycle();
          }
          break;
        case 'expect':
          expectations.push(op);
          break;
      }
    }

    const allTasks = this.nar.getTasks();
    // A derived task is any task whose hash is NOT in the input set.
    const derivedTasks = allTasks.filter(t => !this.inputTaskHashes.has(t.term.hash));

    for (const exp of expectations) {
      const { matcher, criteria, shouldExist } = exp;
      const matchFound = derivedTasks.some(matcher);
      const expectationMet = shouldExist ? matchFound : !matchFound;

      if (!expectationMet) {
        this._reportFailure(exp, derivedTasks);
      }
    }

    return true;
  }

  _reportFailure(exp, derivedTasks) {
    const { criteria, shouldExist } = exp;
    const derivedTasksFormatted = derivedTasks.map(t => `  - ${t.toString()}`).join('\n');
    const failureMessage = `
      ==================== TEST FAILED ====================
      Expectation: ${shouldExist ? 'FIND' : 'NOT FIND'} a task matching criteria.
      Criteria: ${JSON.stringify(criteria)}

      ----- Derived Tasks (${derivedTasks.length}) -----
${derivedTasksFormatted || '  (None)'}
      ---------------------------------------------------
    `;
    throw new Error(failureMessage);
  }

  _createMatcher(criteria) {
    if (typeof criteria === 'string') {
      return task => task.term.toString() === criteria;
    }

    return task => {
      if (criteria.term && task.term.toString() !== criteria.term) return false;
      if (criteria.punctuation && task.punctuation !== criteria.punctuation) return false;
      if (criteria.truth) {
        if (criteria.truth.minFrequency && task.truth.frequency < criteria.truth.minFrequency) return false;
        if (criteria.truth.minConfidence && task.truth.confidence < criteria.truth.minConfidence) return false;
      }
      return true;
    };
  }

  _createTaskFromString(taskStr, punctuation = Punctuation.BELIEF, freq = 0.9, conf = 0.9, priority = 0.9) {
    let term;
    let cleanStr = taskStr.trim();
    if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
      cleanStr = cleanStr.substring(1, cleanStr.length - 1);
    }

    const relationRegex = /^(?:(\".*?\"|\S+))\s*(-->|==>)\s*(?:(\".*?\"|\S+))$/;
    const match = cleanStr.match(relationRegex);

    if (match) {
      const [_, subject, operator, predicate] = match;
      const relationType = operator === '-->' ? TermType.INHERITANCE : TermType.IMPLICATION;
      term = Term.createCompound(relationType, [Term.newAtom(subject.replace(/"/g, '')), Term.newAtom(predicate.replace(/"/g, ''))]);
    } else {
      term = Term.newAtom(cleanStr.replace(/"/g, ''));
    }

    const truth = new TruthValue(freq, conf);
    return new Task(term, punctuation, truth, Date.now(), Date.now(), priority);
  }
}