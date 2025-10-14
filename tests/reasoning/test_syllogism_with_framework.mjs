/**
 * Test the Syllogistic reasoning rules using the general-purpose reasoning test framework
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

// Define the test configuration
const syllogisticTestConfig = {
  description: "Syllogistic Reasoning: (a --> b) and (b --> c) should derive (a --> c)",
  inputs: [
    // Input task 1: (a --> b)
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('a'), Term.newAtom('b')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.9, 0.9), // high frequency and confidence
      priority: 0.9
    },
    // Input task 2: (b --> c)
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('b'), Term.newAtom('c')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.8, 0.8), // high frequency and confidence
      priority: 0.8
    }
  ],
  expectedOutputs: [
    // Expected output: (a --> c)
    function(task) {
      return task.term.name.includes('a') && 
             task.term.name.includes('c') && 
             task.term.name.includes('-->');
    }
  ],
  notExpectedOutputs: [
    // We don't expect to derive something like (c --> a)
    function(task) {
      return task.term.name.includes('c') && 
             task.term.name.includes('a') && 
             task.term.name.includes('-->') &&
             task.term.name.includes('c-->a');
    }
  ],
  cycles: 1, // Just one cycle for this simple test
  reasoner: syllogisticReasoner
};

// Run the test
try {
  const success = runGeneralReasoningTest(syllogisticTestConfig);
  if (success) {
    console.log('\n🎊 Syllogistic reasoning test with framework PASSED!');
  } else {
    console.log('\n💥 Syllogistic reasoning test with framework FAILED!');
  }
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('\n💥 Test error:', error);
  process.exit(1);
}