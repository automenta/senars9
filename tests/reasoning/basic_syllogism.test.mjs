/**
 * Basic Syllogistic reasoning test using Jest framework
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';

describe('Syllogistic Reasoning Tests', () => {
  test('should derive (a --> c) from (a --> b) and (b --> c)', async () => {
    // Using the builder pattern for minimal boilerplate
    const testBuilder = new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (b --> c) should derive (a --> c)");

    const success = await testBuilder
      .input("(a --> b)", undefined, 0.9, 0.9)  // term, punctuation, freq, conf
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(createReasoner(DeductiveSyllogismRule))  // Using the helper to create reasoner
      .expect("(a --> c)")
      .notExpect("(c --> a)")
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });
});