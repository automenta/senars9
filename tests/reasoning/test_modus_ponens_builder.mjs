/**
 * Example: Testing Modus Ponens with the improved API that has minimal boilerplate
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { ModusPonens } from '../../core/reasoning/ModusPonensRule.js';

// Using the builder pattern for minimal boilerplate
const test = new ReasoningTestBuilder("Modus Ponens: (a ==> b) and a should derive b");

const success = test
  .input("a ==> b", undefined, 0.9, 0.9)
  .input("a", undefined, 0.8, 0.8)
  .using(createReasoner(ModusPonens))
  .expect("b")
  .notExpect("a")  // Should not re-derive the input
  .cycles(2)
  .run();

if (success) {
  console.log('\n🎊 Modus Ponens Builder API test PASSED!');
} else {
  console.log('\n💥 Modus Ponens Builder API test FAILED!');
}

process.exit(success ? 0 : 1);