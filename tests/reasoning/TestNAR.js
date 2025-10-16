/**
 * @file tests/reasoning/TestNAR.js
 * @description NAR extension for declarative testing functionality.
 */

import { NAR } from '../../core/NAR.js';
import { Punctuation } from '../../core/Task.js';

/**
 * A NAR extension that adds declarative testing functionality.
 * Provides fluent methods for creating and running reasoning tests with minimal boilerplate.
 */
export class TestNAR extends NAR {
  constructor(config = {}) {
    // Call parent constructor
    super(config);
    this.testHistory = [];
    this.expectations = [];
    this.inputs = [];
    this.runs = [];
  }

  /**
   * Initialize the TestNAR with proper testing setup
   */
  async initialize() {
    // Initialize components but don't load rules for testing specific rules only
    this._initialize(this.config);
    
    // Clear all initially loaded rules to allow individual rule testing
    this.reasoner.rules.clear();
    this.reasoner.enabledRuleIds.clear();
    
    // Store reference to original input method
    this.inputOriginal = super.input.bind(this);
    
    // Initialize test tracking
    this.inputs = [];
    this.expectations = [];
    this.runs = [];
    
    return this;
  }

  /**
   * Record an input with optional time
   * @param {string|object} taskData - Task data to input
   * @param {number} time - Optional time at which to input the task
   * @returns {TestNAR} This instance for chaining
   */
  input(taskData, time = null) {
    this.inputs.push({ taskData, time, type: 'input' });
    return this;
  }

  /**
   * Record a belief with optional time
   * @param {string} content - The belief content
   * @param {Object} truth - Truth values {frequency, confidence}
   * @param {number} time - Optional time at which to input the task
   * @returns {TestNAR} This instance for chaining
   */
  belief(content, truth = { frequency: 0.9, confidence: 0.9 }, time = null) {
    this.inputs.push({ 
      taskData: { term: content, punctuation: Punctuation.BELIEF, truth }, 
      time, 
      type: 'belief' 
    });
    return this;
  }

  /**
   * Record a goal with optional time
   * @param {string} content - The goal content
   * @param {Object} truth - Truth values {frequency, confidence}
   * @param {number} time - Optional time at which to input the task
   * @returns {TestNAR} This instance for chaining
   */
  goal(content, truth = { frequency: 0.9, confidence: 0.9 }, time = null) {
    this.inputs.push({ 
      taskData: { term: content, punctuation: Punctuation.GOAL, truth }, 
      time, 
      type: 'goal' 
    });
    return this;
  }

  /**
   * Record a question with optional time
   * @param {string} content - The question content
   * @param {number} time - Optional time at which to input the task
   * @returns {TestNAR} This instance for chaining
   */
  question(content, time = null) {
    this.inputs.push({ 
      taskData: { term: content, punctuation: Punctuation.QUESTION }, 
      time, 
      type: 'question' 
    });
    return this;
  }

  /**
   * Record a reasoning run with optional time
   * @param {number} cycles - Number of cycles to run
   * @param {number} time - Optional time at which to run
   * @returns {TestNAR} This instance for chaining
   */
  run(cycles = 1, time = null) {
    this.runs.push({ cycles, time });
    return this;
  }

  /**
   * Add an expectation to check after all inputs/runs are processed
   * @param {Object} criteria - Criteria for the expected task
   * @param {number} fromTime - Start time range for expectation
   * @param {number} toTime - End time range for expectation
   * @param {boolean} shouldExist - Whether the task should exist (true) or not exist (false)
   * @returns {TestNAR} This instance for chaining
   */
  expect(criteria, fromTime = 0, toTime = Infinity, shouldExist = true) {
    this.expectations.push({ 
      criteria, 
      fromTime, 
      toTime, 
      shouldExist,
      type: 'positive' 
    });
    return this;
  }

  /**
   * Add a negative expectation (should NOT exist)
   * @param {Object} criteria - Criteria for the task that should NOT exist
   * @param {number} fromTime - Start time range for expectation
   * @param {number} toTime - End time range for expectation
   * @returns {TestNAR} This instance for chaining
   */
  expectNot(criteria, fromTime = 0, toTime = Infinity) {
    this.expectations.push({ 
      criteria, 
      fromTime, 
      toTime, 
      shouldExist: false,
      type: 'negative' 
    });
    return this;
  }

  /**
   * Execute the recorded inputs, runs, and then check expectations
   * @returns {Object} Results of the test execution
   */
  async execute() {
    // Process all inputs in order
    for (const input of this.inputs) {
      const { taskData, type } = input;
      
      if (type === 'input') {
        this.inputOriginal(taskData);
      } else if (type === 'belief') {
        this.believe(taskData.term, taskData.truth);
      } else if (type === 'goal') {
        this.want(taskData.term, taskData.truth);
      } else if (type === 'question') {
        this.ask(taskData.term);
      }
    }
    
    // Perform all runs
    for (const run of this.runs) {
      const { cycles } = run;
      for (let i = 0; i < cycles; i++) {
        await this.runCycle();
      }
    }
    
    // Check all expectations
    const results = {
      passed: true,
      details: [],
      expectations: this.expectations.length
    };
    
    for (const expectation of this.expectations) {
      const { criteria, shouldExist } = expectation;
      const matches = this._findMatchingTasks(criteria);
      const hasMatch = matches.length > 0;
      const expectationMet = shouldExist ? hasMatch : !hasMatch;
      
      results.details.push({
        criteria,
        shouldExist,
        hasMatch,
        matches,
        passed: expectationMet
      });
      
      if (!expectationMet) {
        results.passed = false;
      }
    }
    
    return results;
  }
  
  /**
   * Find tasks that match the given criteria
   * @param {Object} criteria - Criteria for matching tasks
   * @returns {Array} Array of matching tasks
   * @private
   */
  _findMatchingTasks(criteria) {
    const allTasks = this.getTasks();
    const matches = [];
    
    for (const task of allTasks) {
      let isMatch = true;
      
      // Check term match
      if (criteria.term !== undefined) {
        const termStr = task.term.toString();
        if (typeof criteria.term === 'string') {
          if (!termStr.includes(criteria.term)) {
            isMatch = false;
          }
        } else if (criteria.term instanceof RegExp) {
          if (!criteria.term.test(termStr)) {
            isMatch = false;
          }
        } else {
          if (termStr !== criteria.term) {
            isMatch = false;
          }
        }
      }
      
      // Check punctuation match
      if (isMatch && criteria.punctuation !== undefined && task.punctuation !== criteria.punctuation) {
        isMatch = false;
      }
      
      // Check truth values
      if (isMatch && task.truth) {
        if (criteria.minFrequency !== undefined && task.truth.frequency < criteria.minFrequency) {
          isMatch = false;
        }
        if (criteria.maxFrequency !== undefined && task.truth.frequency > criteria.maxFrequency) {
          isMatch = false;
        }
        if (criteria.minConfidence !== undefined && task.truth.confidence < criteria.minConfidence) {
          isMatch = false;
        }
        if (criteria.maxConfidence !== undefined && task.truth.confidence > criteria.maxConfidence) {
          isMatch = false;
        }
      }
      
      if (isMatch) {
        matches.push(task);
      }
    }
    
    return matches;
  }

  /**
   * Expect a specific condition to be true after reasoning
   * @param {Function} condition - A function that takes current NAR state and returns boolean
   * @returns {boolean} Whether the condition is met
   */
  expectCondition(condition) {
    return condition(this);
  }

  /**
   * Assert that a specific term should exist in the current tasks
   * @param {string} expectedTerm - The term that should exist
   * @param {Object} options - Options for matching {punctuation, truth}
   * @returns {boolean} Whether the assertion passes
   */
  assertExists(expectedTerm, options = {}) {
    const exists = this.expect(expectedTerm, options);
    if (!exists) {
      console.error(`❌ Assertion failed: Expected term "${expectedTerm}" not found`);
    }
    return exists;
  }

  /**
   * Assert that a specific term should NOT exist in the current tasks
   * @param {string} unexpectedTerm - The term that should not exist
   * @param {Object} options - Options for matching {punctuation, truth}
   * @returns {boolean} Whether the assertion passes
   */
  assertNotExists(unexpectedTerm, options = {}) {
    const exists = this.expect(unexpectedTerm, options);
    if (exists) {
      console.error(`❌ Assertion failed: Unexpected term "${unexpectedTerm}" was found`);
    }
    return !exists;
  }

  /**
   * Run multiple reasoning cycles
   * @param {number} count - Number of cycles to run
   * @param {number} delay - Delay between cycles in ms
   * @returns {Array} Results from each cycle
   */
  async runCyclesWithHistory(count, delay = 0) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const result = await this.runCycle();
      results.push(result);
      this.testHistory.push({
        cycle: i,
        derivedTasks: result,
        totalTasks: this.getTasks().length,
        timestamp: Date.now()
      });
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return results;
  }

  /**
   * Get the history of test runs
   * @returns {Array} Array of test history objects
   */
  getTestHistory() {
    return [...this.testHistory];
  }

  /**
   * Clear the test history
   */
  clearHistory() {
    this.testHistory = [];
  }

  /**
   * Run a complex test scenario with setup, execution, and assertions
   * @param {Object} scenario - Test scenario with inputs, cycles, and expectations
   * @returns {Object} Test result with success status and details
   */
  async runScenario(scenario) {
    const { 
      name = 'Test Scenario',
      inputs = [],
      cycles = 1,
      expectations = [],
      beforeRun = null,
      afterRun = null 
    } = scenario;

    console.log(`🧪 Running scenario: ${name}`);

    // Clear any previous state if needed
    this.clearHistory();

    // Setup phase
    for (const input of inputs) {
      if (typeof input === 'string') {
        this.input(input);
      } else if (typeof input === 'object') {
        if (input.type === 'belief') {
          this.belief(input.content, input.truth);
        } else if (input.type === 'goal') {
          this.goal(input.content, input.truth);
        } else if (input.type === 'question') {
          this.question(input.content);
        } else {
          this.input(input);
        }
      }
    }

    if (beforeRun) {
      beforeRun(this);
    }

    // Execution phase
    const cycleResults = await this.runCyclesWithHistory(cycles);

    if (afterRun) {
      afterRun(this);
    }

    // Validation phase
    const results = {
      name,
      success: true,
      inputs: inputs.length,
      cycles,
      totalTasks: this.getTasks().length,
      derivedTasks: cycleResults.flat().length,
      expectations: expectations.length,
      expectationResults: []
    };

    for (const expectation of expectations) {
      let expectationResult;
      let description = 'Unknown expectation';

      if (typeof expectation === 'function') {
        expectationResult = expectation(this);
        description = expectation.toString();
      } else if (typeof expectation === 'object' && expectation.term) {
        const { term, punctuation, minFrequency, minConfidence, shouldExist = true } = expectation;
        const matches = this.expect(term, { punctuation, minFrequency, minConfidence });
        expectationResult = shouldExist ? matches : !matches;
        description = `Term '${term}' should${shouldExist ? '' : ' not'} exist with specified properties`;
      } else if (typeof expectation === 'string') {
        expectationResult = this.expect(expectation);
        description = `Term '${expectation}' should exist`;
      }

      const expectationPassed = Boolean(expectationResult);
      results.expectationResults.push({ 
        description, 
        passed: expectationPassed, 
        result: expectationResult 
      });

      if (!expectationPassed) {
        results.success = false;
      }
    }

    // Log results
    if (results.success) {
      console.log(`✅ Scenario "${name}" PASSED`);
    } else {
      console.log(`❌ Scenario "${name}" FAILED`);
      results.expectationResults.forEach((result, idx) => {
        if (!result.passed) {
          console.log(`  ❌ Expectation ${idx + 1} failed: ${result.description}`);
        } else {
          console.log(`  ✅ Expectation ${idx + 1} passed: ${result.description}`);
        }
      });
    }

    return results;
  }
}