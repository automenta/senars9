/**
 * General-purpose reasoning test framework
 * This framework allows defining arbitrary reasoner tests with positive and negative examples
 * and testing all reasoner rules (not just syllogism). Designed with minimal boilerplate.
 */

import { Task, Punctuation, TruthValue } from '../../core/Task.js';
import { Term, TermType } from '../../core/Term.js';
import { CycleContext } from '../../core/Cycle.js';
import { withCoreSetup } from '../unit/enhanced-test-utils.js';

// Helper function to format a task with rounded truth values for display
function formatTaskWithRoundedTruth(task) {
  if (!task) return 'null';
  
  let termStr = 'Unknown';
  if (task.term) {
    if (typeof task.term.toString === 'function') {
      termStr = task.term.toString();
    } else if (task.term.name) {
      termStr = task.term.name;
    } else {
      termStr = JSON.stringify(task.term);
    }
  }
  
  let truthStr = '';
  if (task.truth) {
    const freq = Math.round((task.truth.frequency || 0) * 100) / 100;
    const conf = Math.round((task.truth.confidence || 0) * 100) / 100;
    truthStr = `{f:${freq}, c:${conf}}`;
  }
  
  const punctuation = task.punctuation || '';
  return `${termStr}${punctuation} ${truthStr}`.trim();
}

/**
 * A general-purpose reasoning test that takes inputs and expected output matchers
 * @param {Object} config - Configuration object for the test
 * @param {Array<Object>} config.inputs - Array of input tasks to add to memory
 * @param {Array<Function>} config.expectedOutputs - Array of matcher functions that return true if the output is expected
 * @param {Array<Function>} config.notExpectedOutputs - Array of matcher functions that return true if output should NOT match
 * @param {number} config.cycles - Number of reasoning cycles to run
 * @param {Array<Rule>} config.rules - The rules to register with the reasoner.
 * @param {string} config.description - Description of the test for logging
 * @returns {boolean} - Whether the test passed
 */
export const runGeneralReasoningTest = withCoreSetup(async (core, config) => {
  const { memory, reasoner } = core;
  const context = new CycleContext(Date.now());

  // Register rules with the reasoner
  if (config.rules) {
    for (const rule of config.rules) {
      reasoner.registerRule(rule);
    }
  }
  
  // Add input tasks to memory
  for (const [index, input] of config.inputs.entries()) {
    const task = createTaskFromInput(input);
    memory.addTask(task, Date.now() + index);
  }
  
  // Run the reasoner for N cycles
  const allDerivedTasks = new Set(); // Use Set to avoid duplicates
  for (let cycle = 0; cycle < config.cycles; cycle++) {
    const focusItems = core.focus.getFocusItems();
    const focusTasks = focusItems.map(item => item[1]);
    const derivedTasks = await reasoner.reason(focusTasks, memory, context);
    if (derivedTasks && derivedTasks.length > 0) {
      derivedTasks.forEach(derivedTask => {
        allDerivedTasks.add(derivedTask);
        memory.addTask(derivedTask, Date.now());
      });
    }
  }
  
  // Convert Set back to array
  const allDerivedTasksArray = Array.from(allDerivedTasks);
  
  // Check expected outputs
  let expectedOutputsPassed = true;
  if (config.expectedOutputs && config.expectedOutputs.length > 0) {
    for (let i = 0; i < config.expectedOutputs.length; i++) {
      const matcher = config.expectedOutputs[i];
      const foundMatch = allDerivedTasksArray.some(task => matcher(task));
      
      if (!foundMatch) {
        expectedOutputsPassed = false;
      }
    }
  }
  
  // Check not-expected outputs
  let notExpectedOutputsPassed = true;
  if (config.notExpectedOutputs && config.notExpectedOutputs.length > 0) {
    for (let i = 0; i < config.notExpectedOutputs.length; i++) {
      const matcher = config.notExpectedOutputs[i];
      const foundMatch = allDerivedTasksArray.some(task => matcher(task));
      
      if (foundMatch) {
        notExpectedOutputsPassed = false;
      }
    }
  }
  
  const testPassed = expectedOutputsPassed && notExpectedOutputsPassed;
  
  // Only log if the test failed or if we're in debug mode
  if (!testPassed) {
    console.log(`🧪 Running test: ${config.description}`);
    console.log(`📋 Input tasks: ${config.inputs.length}`);
    config.inputs.forEach((input, index) => {
      const task = createTaskFromInput(input);
      console.log(`  ${index + 1}. ${formatTaskWithRoundedTruth(task)} [priority: ${task.getPriority()}]`);
    });
    console.log(`📊 Total derived tasks: ${allDerivedTasksArray.length}`);
    
    if (allDerivedTasksArray.length > 0) {
      console.log('🎉 Derived tasks:');
      allDerivedTasksArray.forEach((task, i) => {
        console.log(`  ${i + 1}. ${formatTaskWithRoundedTruth(task)} [priority: ${task.getPriority()}]`);
      });
    }
    
    if (config.expectedOutputs && config.expectedOutputs.length > 0) {
      console.log(`🔍 Checking ${config.expectedOutputs.length} expected output conditions...`);
      for (let i = 0; i < config.expectedOutputs.length; i++) {
        const matcher = config.expectedOutputs[i];
        const foundMatch = allDerivedTasksArray.some(task => matcher(task));
        if (foundMatch) {
          console.log(`  ✅ Expected output condition ${i + 1} PASSED`);
        } else {
          console.log(`  ❌ Expected output condition ${i + 1} FAILED - no matching task found`);
        }
      }
    }
    
    if (config.notExpectedOutputs && config.notExpectedOutputs.length > 0) {
      console.log(`🔍 Checking ${config.notExpectedOutputs.length} not-expected output conditions...`);
      for (let i = 0; i < config.notExpectedOutputs.length; i++) {
        const matcher = config.notExpectedOutputs[i];
        const foundMatch = allDerivedTasksArray.some(task => matcher(task));
        if (foundMatch) {
          const matchingTask = allDerivedTasksArray.find(task => matcher(task));
          console.log(`  ❌ Not-expected output condition ${i + 1} FAILED - found matching task: ${formatTaskWithRoundedTruth(matchingTask)}`);
        } else {
          console.log(`  ✅ Not-expected output condition ${i + 1} PASSED`);
        }
      }
    }
    
    console.log('\n💥 Test FAILED! Some conditions were not met.');
  }
  
  return testPassed;
});

// Convenience builder function for creating tests with minimal boilerplate
export class ReasoningTestBuilder {
  constructor(description) {
    this.config = {
      description: description || 'Reasoning test',
      inputs: [],
      expectedOutputs: [],
      notExpectedOutputs: [],
      cycles: 1,
      rules: []
    };
  }

  // Add an input task (can be specified as a string or object)
  input(termStr, punctuation = Punctuation.BELIEF, freq = 0.9, conf = 0.9, priority = 0.9) {
    const task = createTaskFromString(termStr, punctuation, freq, conf, priority);
    this.config.inputs.push(task);
    return this; // for chaining
  }

  // Add a rule to the reasoner
  using(rule) {
    this.config.rules.push(rule);
    return this;
  }

  // Expect a specific output (can be specified as a string pattern)
  expect(outputStr) {
    this.config.expectedOutputs.push(task => task.term.name === outputStr);
    return this;
  }

  // Expect a specific output using a custom matcher function
  expectCustom(matcher) {
    this.config.expectedOutputs.push(matcher);
    return this;
  }

  // Ensure a specific output does NOT occur
  notExpect(outputStr) {
    this.config.notExpectedOutputs.push(task => task.term.name === outputStr);
    return this;
  }

  // Ensure a specific output does NOT occur using a custom matcher function
  notExpectCustom(matcher) {
    this.config.notExpectedOutputs.push(matcher);
    return this;
  }

  // Set number of cycles to run
  cycles(num) {
    this.config.cycles = num;
    return this;
  }

  // Run the test
  async run() {
    return await runGeneralReasoningTest(this.config);
  }
}

/**
 * Helper function to create a Task from an input specification or string
 * @param {Object|string} input - Input specification containing term, punctuation, truth values, etc. or a string like "a --> b"
 * @returns {Task} - The created Task instance
 */
function createTaskFromInput(input) {
  // If input is a string, parse it to create the task
  if (typeof input === 'string') {
    return createTaskFromString(input);
  }
  
  // If input is already a Task, return it
  if (input instanceof Task) {
    return input;
  }
  
  // Otherwise, create from specification
  const {
    term,
    punctuation = Punctuation.BELIEF,
    truthValue = new TruthValue(0.9, 0.9),
    creationTime = Date.now(),
    occurrenceTime = Date.now(),
    priority = 0.9
  } = input;
  
  return new Task(
    term,
    punctuation,
    truthValue,
    creationTime,
    occurrenceTime,
    priority
  );
}

/**
 * Helper function to create a task from a string description
 * @param {string} taskStr - String describing the task in format like "a --> b", "a", "(a ==> b)", etc.
 * @param {Punctuation} punctuation - The punctuation (BELIEF, GOAL, etc.)
 * @param {number} freq - Truth frequency (0-1)
 * @param {number} conf - Truth confidence (0-1)
 * @param {number} priority - Task priority (0-1)
 * @returns {Task} - The created Task instance
 */
function createTaskFromString(taskStr, punctuation = Punctuation.BELIEF, freq = 0.9, conf = 0.9, priority = 0.9) {
  let term;
  
  // Clean up the string by removing outer parentheses if present
  let cleanStr = taskStr.trim();
  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    cleanStr = cleanStr.substring(1, cleanStr.length - 1);
  }
  
  // Handle simple atoms (no arrows)
  if (!cleanStr.includes('-->') && !cleanStr.includes('==>')) {
    term = Term.newAtom(cleanStr);
  } 
  // Handle inheritance relations (a --> b)
  else if (cleanStr.includes('-->')) {
    const [subject, predicate] = cleanStr.split('-->').map(s => s.trim());
    term = Term.createCompound(TermType.INHERITANCE, [Term.newAtom(subject), Term.newAtom(predicate)]);
  }
  // Handle implication relations (a ==> b)
  else if (cleanStr.includes('==>')) {
    const [subject, predicate] = cleanStr.split('==>').map(s => s.trim());
    term = Term.createCompound(TermType.IMPLICATION, [Term.newAtom(subject), Term.newAtom(predicate)]);
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

/**
 * Helper function to create a simple term with name and type
 * @param {string} name - Name of the term
 * @param {TermType} type - Type of the term
 * @returns {Term} - The created Term instance
 */
export function createTerm(name, type = TermType.ATOM) {
  if (type === TermType.ATOM) {
    return Term.newAtom(name);
  } else if (type === TermType.INHERITANCE) {
    const [subject, predicate] = name.split(/--?>|->/).map(s => s.trim());
    if (subject && predicate) {
      return Term.createCompound(TermType.INHERITANCE, [Term.newAtom(subject), Term.newAtom(predicate)]);
    }
  } else if (type === TermType.IMPLICATION) {
    const [subject, predicate] = name.split(/==?>|=>/).map(s => s.trim());
    if (subject && predicate) {
      return Term.createCompound(TermType.IMPLICATION, [Term.newAtom(subject), Term.newAtom(predicate)]);
    }
  }
  return Term.newAtom(name);
}

/**
 * Helper function to create a TruthValue with frequency and confidence
 * @param {number} frequency - Truth frequency (0-1)
 * @param {number} confidence - Truth confidence (0-1)
 * @returns {TruthValue} - The created TruthValue instance
 */
export function createTruthValue(frequency, confidence) {
  return new TruthValue(frequency, confidence);
}

/**
 * Helper matcher function that checks if a task contains a specific term pattern
 * @param {string} pattern - Pattern to search for in the task's term
 * @returns {Function} - A matcher function that returns true if the task matches
 */
export function containsTerm(pattern) {
  return function(task) {
    return task.term.name && task.term.name.includes(pattern);
  };
}

/**
 * Helper matcher function that checks if a task matches a specific term structure
 * @param {string} subject - Subject of the term (for inheritance relations)
 * @param {string} predicate - Predicate of the term (for inheritance relations)
 * @param {TermType} type - Type of the term (default: INHERITANCE)
 * @returns {Function} - A matcher function that returns true if the task matches
 */
export function hasTermStructure(subject, predicate, type = TermType.INHERITANCE) {
  return function(task) {
    if (task.term.type !== type) return false;
    
    if ((type === TermType.INHERITANCE || type === TermType.IMPLICATION) && task.term.components) {
      // For compound terms, check if both subject and predicate match
      const components = task.term.components;
      if (components.length === 2) {
        const subjectMatch = components[0].name === subject;
        const predicateMatch = components[1].name === predicate;
        return subjectMatch && predicateMatch;
      }
    }
    
    return false;
  };
}

/**
 * Helper matcher function that checks if a task matches specific truth value characteristics
 * @param {number} minFrequency - Minimum frequency value (0-1)
 * @param {number} minConfidence - Minimum confidence value (0-1)
 * @returns {Function} - A matcher function that returns true if the task matches
 */
export function hasTruthValue(minFrequency, minConfidence) {
  return function(task) {
    return task.truth.frequency >= minFrequency && task.truth.confidence >= minConfidence;
  };
}

/**
 * Helper matcher function that checks if a task does NOT match a pattern
 * @param {string} pattern - Pattern to search for in the task's term
 * @returns {Function} - A matcher function that returns true if the task does NOT match
 */
export function notContainsTerm(pattern) {
  return function(task) {
    return !(task.term.name && task.term.name.includes(pattern));
  };
}
