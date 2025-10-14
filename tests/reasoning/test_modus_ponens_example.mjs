/**
 * Example: Testing Modus Ponens reasoning using the general-purpose test framework
 * (If P then Q) and P should derive Q
 */

import { runGeneralReasoningTest, createTerm, createTruthValue } from './framework.mjs';
import { Task, Punctuation, TruthValue } from '../../core/Task.js';
import { Term, TermType } from '../../core/Term.js';
import { Memory } from '../../core/Memory.js';
import { CycleContext } from '../../core/Cycle.js';
import { ModusPonens } from '../../core/reasoning/ModusPonensRule.js';

// Create a modus ponens reasoner function that applies the ModusPonens rule
function modusPonensReasoner(task, memory, context) {
  const rule = new ModusPonens();
  return rule.apply(task, memory, context);
}

// Define a test configuration for Modus Ponens
const modusPonensTestConfig = {
  description: "Modus Ponens: (a --> b) and a should derive b",
  inputs: [
    // Input task 1: (a ==> b) - conditional statement (implication, not inheritance)
    {
      term: Term.createCompound(TermType.IMPLICATION, [Term.newAtom('a'), Term.newAtom('b')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.9, 0.9),
      priority: 0.9
    },
    // Input task 2: a - the antecedent
    {
      term: Term.newAtom('a'),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.8, 0.8),
      priority: 0.8
    }
  ],
  expectedOutputs: [
    // Expected output: b (the consequent)
    function(task) {
      return task.term.name === 'b' && task.punctuation === Punctuation.BELIEF;
    }
  ],
  notExpectedOutputs: [
    // We should NOT derive 'a' again
    function(task) {
      return task.term.name === 'a' && task.punctuation === Punctuation.BELIEF;
    }
  ],
  cycles: 2, // Run for 2 cycles to allow for full reasoning
  reasoner: modusPonensReasoner
};

// Run the test
try {
  const success = runGeneralReasoningTest(modusPonensTestConfig);
  if (success) {
    console.log('\n🎊 Modus Ponens reasoning test with framework PASSED!');
  } else {
    console.log('\n💥 Modus Ponens reasoning test with framework FAILED!');
  }
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('\n💥 Test error:', error);
  process.exit(1);
}