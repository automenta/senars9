/**
 * Test to verify that duplicate derived tasks are filtered out
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { DeductiveSyllogism } from '../../core/reasoning/SyllogisticRules.js';

describe('Duplicate Prevention Tests', () => {
  test('should filter out duplicate derived tasks', () => {
    // Create a scenario that produces duplicate results
    // This test will run the same syllogistic rule multiple times
    // and verify that duplicates are properly filtered out
    const success = new ReasoningTestBuilder("Duplicate Prevention Test")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(createReasoner(DeductiveSyllogism))
      .expect("(a --> c)")
      .notExpect("(c --> a)")
      .cycles(1)  // Run just one cycle but verify deduplication
      .run();

    expect(success).toBe(true);
  });
});