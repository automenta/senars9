/**
 * Example: Testing with the improved API that has minimal boilerplate
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { DeductiveSyllogism } from '../../core/reasoning/SyllogisticRules.js';

// Using the builder pattern for minimal boilerplate
const test = new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (b --> c) should derive (a --> c)");

const success = test
  .input("a --> b", undefined, 0.9, 0.9)  // term, punctuation, freq, conf
  .input("b --> c", undefined, 0.8, 0.8)
  .using(createReasoner(DeductiveSyllogism))  // Using the helper to create reasoner
  .expect("(a --> c)")
  .notExpect("(c --> a)")
  .cycles(1)
  .run();

if (success) {
  console.log('\n🎊 Builder API test PASSED!');
} else {
  console.log('\n💥 Builder API test FAILED!');
}

process.exit(success ? 0 : 1);