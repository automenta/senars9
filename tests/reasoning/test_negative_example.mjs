/**
 * Example: Testing another reasoning pattern using the general-purpose test framework
 * This example tests a reasoning pattern that should NOT produce certain outputs
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

// Define a test configuration with negative examples
const negativeSyllogisticTestConfig = {
  description: "Syllogistic Reasoning: (a --> b) and (c --> d) should NOT derive (a --> d)",
  inputs: [
    // Input task 1: (a --> b)
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('a'), Term.newAtom('b')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.9, 0.9),
      priority: 0.9
    },
    // Input task 2: (c --> d) - no connection to first premise
    {
      term: Term.createCompound(TermType.INHERITANCE, [Term.newAtom('c'), Term.newAtom('d')]),
      punctuation: Punctuation.BELIEF,
      truthValue: new TruthValue(0.8, 0.8),
      priority: 0.8
    }
  ],
  expectedOutputs: [
    // We don't expect any new derived tasks in this case
    // So this will fail (which is what we want for this test)
  ],
  notExpectedOutputs: [
    // We should NOT derive (a --> d) because there's no connection between these terms
    function(task) {
      return task.term.name.includes('a') && 
             task.term.name.includes('d') && 
             task.term.name.includes('-->');
    }
  ],
  cycles: 1,
  reasoner: syllogisticReasoner
};

// Run the test
try {
  const success = runGeneralReasoningTest(negativeSyllogisticTestConfig);
  if (success) {
    console.log('\n🎊 Negative syllogistic reasoning test with framework PASSED! (As expected, no invalid inference was made)');
  } else {
    console.log('\n💥 Negative syllogistic reasoning test with framework FAILED! (Unexpected invalid inference was made)');
  }
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('\n💥 Test error:', error);
  process.exit(1);
}