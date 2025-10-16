/**
 * @file tests/reasoning/TestNAR.js
 * @description NAR extension for declarative testing functionality.
 */

import { withCoreSetup } from '../unit/enhanced-test-utils.js';
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
        this.conditions.push(task => task.term.toString().includes(term));
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
}

/**
 * A NAR extension that adds declarative testing functionality.
 */
export class TestNAR {
  constructor() {
    this.operations = [];
    this.rules = new Set();
  }

  using(rule) {
    this.rules.add(rule);
    return this;
  }

  input(termStr, freq = 0.9, conf = 0.9) {
    this.operations.push({ type: 'input', termStr, freq, conf });
    return this;
  }

  run(cycles = 1) {
    this.operations.push({ type: 'run', cycles });
    return this;
  }

  expect(criteria) {
    const matcher = (criteria instanceof TaskMatch) ? criteria.build() : this._createMatcher(criteria);
    this.operations.push({ type: 'expect', matcher, criteria, shouldExist: true });
    return this;
  }

  expectNot(criteria) {
    const matcher = (criteria instanceof TaskMatch) ? criteria.build() : this._createMatcher(criteria);
    this.operations.push({ type: 'expect', matcher, criteria, shouldExist: false });
    return this;
  }

  execute() {
    return withCoreSetup(async (core) => {
      const { memory, reasoner, focus } = core;

      // Add rules
      for (const rule of this.rules) {
        reasoner.addRule(rule);
      }

      const expectations = [];
      for (const op of this.operations) {
        if (op.type === 'input') {
          const task = this._createTaskFromString(op.termStr, Punctuation.BELIEF, op.freq, op.conf);
          memory.addTask(task, Date.now());
          focus.addTaskToFocus(task, task.getPriority());
        } else if (op.type === 'run') {
          for (let i = 0; i < op.cycles; i++) {
            const focusItems = focus.getFocusItems();
            const focusTasks = focusItems.map(item => item[1].task);
            const derivedTasks = await reasoner.reason(focusTasks, memory, { currentTime: Date.now() });
            for (const derivedTask of derivedTasks) {
              memory.addTask(derivedTask, Date.now());
            }
          }
        } else if (op.type === 'expect') {
          expectations.push(op);
        }
      }

      const allTasks = memory.getAllTasks();
      let allExpectationsMet = true;

      for (const exp of expectations) {
        const { matcher, criteria, shouldExist } = exp;
        const matchFound = allTasks.some(matcher);
        const expectationMet = shouldExist ? matchFound : !matchFound;

        if (!expectationMet) {
          allExpectationsMet = false;
          console.error(`Expectation FAILED: Criteria ${JSON.stringify(criteria)} (shouldExist: ${shouldExist}) was not met.`);
        }
      }

      return allExpectationsMet;
    })();
  }

  _createMatcher(criteria) {
    if (typeof criteria === 'string') {
      return task => task.term.toString().includes(criteria);
    }
    return task => {
      if (criteria.term && !task.term.toString().includes(criteria.term)) return false;
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
      term = Term.createCompound(relationType, [Term.newAtom(subject), Term.newAtom(predicate)]);
    } else {
      term = Term.newAtom(cleanStr);
    }

    return new Task(
      term,
      punctuation,
      new TruthValue(freq, conf),
      Date.now(),
      Date.now(),
      priority
    );
  }
}