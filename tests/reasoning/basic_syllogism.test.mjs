/**
 * Basic Syllogistic reasoning test using Jest framework
 */

import { ReasoningTestBuilder, TaskMatch } from './framework.mjs';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';

describe('Syllogistic Reasoning Tests', () => {
  test('should derive (a --> c) from (a --> b) and (b --> c) with correct truth value', async () => {
    // Using the builder pattern for minimal boilerplate and the new TaskMatch for detailed expectations
    const testBuilder = new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (b --> c) should derive (a --> c)");

    const success = await testBuilder
      .input("(a --> b)", undefined, 0.9, 0.9)  // term, punctuation, freq, conf
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(a --> c)").withTruth(0.71, 0.51)) // freq=0.9*0.8=0.72, conf=0.72*0.9*0.8=0.5184
      .notExpect("(c --> a)")
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });
});
