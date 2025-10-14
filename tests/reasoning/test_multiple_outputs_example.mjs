/**
 * Example: Testing a reasoning pattern that could potentially derive multiple outputs
 */

import { runGeneralReasoningTest, createTerm, createTruthValue } from './framework.mjs';
import { Task, Punctuation, TruthValue } from '../../core/Task.js';
import { Term, TermType } from '../../core/Term.js';
import { Memory } from '../../core/Memory.js';
import { CycleContext } from '../../core/Cycle.js';
import { DeductiveSyllogism } from '../../core/reasoning/SyllogisticRules.js';

// Create a syllogistic reasoner function that applies the DeductiveSyllogism rule
function syllogisticReasoner(task, memory, context) {
  const rule = new DeductiveSyllogism();
  return rule.apply(task, memory, context);
}

// Define a test configuration with multiple possible outputs
const multipleOutputsTestConfig = {
  description: "Syllogistic Reasoning with multiple premises: Testing multiple possible inferences",
  inputs: [
    // Input task 1: (a --> b)
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('a'), Term.newAtom('b')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.9, 0.9),
      priority: 0.9
    },
    // Input task 2: (b --> c)
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('b'), Term.newAtom('c')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.8, 0.8),
      priority: 0.8
    },
    // Input task 3: (c --> d)
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('c'), Term.newAtom('d')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.7, 0.7),
      priority: 0.7
    }
  ],
  expectedOutputs: [
    // Expected output 1: (a --> c) - from first two premises
    function(task) {
      return task.term.name === '(a --> c)';
    },
    // Expected output 2: (b --> d) - from second and third premises
    function(task) {
      return task.term.name === '(b --> d)';
    },
    // Expected output 3: (a --> d) - from transitivity across all three
    function(task) {
      return task.term.name === '(a --> d)';
    }
  ],
  notExpectedOutputs: [
    // We should NOT derive (d --> a)
    function(task) {
      return task.term.name === '(d --> a)';
    },
    // We should NOT derive a term with wrong punctuation
    function(task) {
      return task.term.name === '(a --> c)' && 
             task.punctuation !== Punctuation.BELIEF;
    }
  ],
  cycles: 3, // More cycles to allow for complex transitivity
  reasoner: syllogisticReasoner
};

// Run the test
try {
  const success = runGeneralReasoningTest(multipleOutputsTestConfig);
  if (success) {
    console.log('\n🎊 Multi-output syllogistic reasoning test with framework PASSED!');
  } else {
    console.log('\n💥 Multi-output syllogistic reasoning test with framework FAILED!');
  }
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('\n💥 Test error:', error);
  process.exit(1);
}