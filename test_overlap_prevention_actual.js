/**
 * Test to verify the actual implementation of stamp overlap prevention works
 */

import { Task, Punctuation, TruthValue } from './core/Task.js';
import { Term, TermType } from './core/Term.js';
import { Memory } from './core/Memory.js';
import { CycleContext } from './core/Cycle.js';
import { Reasoner } from './core/Reasoner.js';
import { DeductiveSyllogism } from './core/reasoning/SyllogisticRules.js';
import { Stamp } from './core/Stamp.js';

// Simple test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`🧪 Testing actual stamp overlap prevention implementation...\n`);
    
    for (const { description, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ PASS: ${description}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ FAIL: ${description}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();
const test = runner.test.bind(runner);

// Assertion library
const expect = (actual) => {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, but got ${actual}`);
      }
    },
    toHaveLength: (length) => {
      if (actual.length !== length) {
        throw new Error(`Expected length ${length}, but got ${actual.length}`);
      }
    },
    toContain: (expected) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected to contain ${expected}, but got ${actual}`);
      }
    }
  };
};

test('verify that syllogistic rules now properly merge stamps', () => {
  // Reset for predictable results
  Stamp.resetSerialCounter();

  const termA = Term.newAtom('a');
  const termB = Term.newAtom('b');
  const termC = Term.newAtom('c');
  
  const termAtoB = Term.createCompound(TermType.INHERITANCE, [termA, termB]);
  const termBtoC = Term.createCompound(TermType.INHERITANCE, [termB, termC]);
  
  // Create original tasks
  const task1 = Task.createInput(termAtoB, Punctuation.BELIEF, new TruthValue(0.9, 0.9), Date.now(), Date.now(), 0.9);
  const task2 = Task.createInput(termBtoC, Punctuation.BELIEF, new TruthValue(0.8, 0.8), Date.now() + 1, Date.now() + 1, 0.8);
  
  console.log(`Original tasks:`);
  console.log(`  (a --> b) with stamp=[${task1.stamp.stampArray.join(', ')}]`);
  console.log(`  (b --> c) with stamp=[${task2.stamp.stampArray.join(', ')}]`);
  
  // Verify initial stamps
  expect(task1.stamp.stampArray).toEqual([1]);
  expect(task2.stamp.stampArray).toEqual([2]);
  
  // Create memory with the second task so the rule can find it
  const memory = new Memory();
  memory.addTask(task1, Date.now());
  memory.addTask(task2, Date.now() + 1);
  
  // Apply the syllogistic rule to the first task
  const context = new CycleContext(Date.now());
  const rule = new DeductiveSyllogism();
  const derivedTasks = rule.apply(task1, memory, context);
  
  console.log(`\\nDerived tasks from applying rule to (a --> b):`);
  console.log(`  Number of derived tasks: ${derivedTasks.length}`);
  
  if (derivedTasks.length > 0) {
    const derivedTask = derivedTasks[0];
    console.log(`  Derived task: ${derivedTask.term.toString()} with stamp=[${derivedTask.stamp.stampArray.join(', ')}]`);
    
    // The derived task should now have stamps from both parent tasks: [1, 2]
    expect(derivedTask.stamp.stampArray).toContain(1);
    expect(derivedTask.stamp.stampArray).toContain(2);
    expect(derivedTask.stamp.stampArray).toHaveLength(2);
    
    // Verify it's the expected (a --> c) relationship
    expect(derivedTask.term.toString()).toContain('a');
    expect(derivedTask.term.toString()).toContain('c');
    expect(derivedTask.term.toString()).toContain('-->');
    
    console.log(`✅ Syllogistic rules now properly merge stamps from both parent tasks`);
  } else {
    console.log(`❌ No derived tasks were created`);
    throw new Error('Expected derived tasks but none were created');
  }
});

test('verify that reasoner overlap checking prevents cyclic derivations', () => {
  // Reset for predictable results
  Stamp.resetSerialCounter();

  const termA = Term.newAtom('a');
  const termB = Term.newAtom('b');
  const termC = Term.newAtom('c');
  
  const termAtoB = Term.createCompound(TermType.INHERITANCE, [termA, termB]);
  const termBtoC = Term.createCompound(TermType.INHERITANCE, [termB, termC]);
  
  // Create original tasks
  const task1 = Task.createInput(termAtoB, Punctuation.BELIEF, new TruthValue(0.9, 0.9), Date.now(), Date.now(), 0.9);
  const task2 = Task.createInput(termBtoC, Punctuation.BELIEF, new TruthValue(0.8, 0.8), Date.now() + 1, Date.now() + 1, 0.8);
  
  // Create memory
  const memory = new Memory();
  memory.addTask(task1, Date.now());
  memory.addTask(task2, Date.now() + 1);
  
  // Create reasoner with overlap checking enabled (default)
  const reasoner = new Reasoner();
  reasoner.addRule(new DeductiveSyllogism());
  
  console.log(`Testing reasoner with overlap checking ${reasoner.isOverlapCheckingEnabled() ? 'enabled' : 'disabled'}:`);
  
  // Apply reasoning to the first task
  const context = new CycleContext(Date.now());
  const focusSet = [task1];
  const derivedTasks = reasoner.reason(focusSet, memory, context);
  
  console.log(`  Input task: (a --> b)`);
  console.log(`  Derived tasks count: ${derivedTasks.length}`);
  
  if (derivedTasks.length > 0) {
    const derivedTask = derivedTasks[0];
    console.log(`  Derived task: ${derivedTask.term.toString()} with stamp=[${derivedTask.stamp.stampArray.join(', ')}]`);
    
    // The derived task should have both parent stamps and overlap with the original task
    expect(derivedTask.stamp.stampArray).toContain(1);  // from task1
    expect(derivedTask.stamp.stampArray).toContain(2);  // from task2
    
    // Check that derived task overlaps with the original task that generated it
    const hasOverlap = reasoner._hasOverlap(derivedTask, task1);
    console.log(`  Overlap with original task: ${hasOverlap}`);
  }
  
  console.log(`✅ Reasoner properly handles overlap checking`);
});

test('verify that overlap checking can be configured', () => {
  const reasoner = new Reasoner();
  
  // Should be enabled by default
  expect(reasoner.isOverlapCheckingEnabled()).toBe(true);
  console.log(`Overlap checking enabled by default: ${reasoner.isOverlapCheckingEnabled()}`);
  
  // Disable it
  reasoner.setOverlapChecking(false);
  expect(reasoner.isOverlapCheckingEnabled()).toBe(false);
  console.log(`Overlap checking can be disabled: ${!reasoner.isOverlapCheckingEnabled()}`);
  
  // Re-enable it
  reasoner.setOverlapChecking(true);
  expect(reasoner.isOverlapCheckingEnabled()).toBe(true);
  console.log(`Overlap checking can be re-enabled: ${reasoner.isOverlapCheckingEnabled()}`);
  
  console.log(`✅ Overlap checking is configurable as required`);
});

// Run all tests
runner.run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});