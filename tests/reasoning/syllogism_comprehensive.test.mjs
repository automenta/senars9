/**
 * Comprehensive Syllogistic reasoning tests using Jest framework
 */

import { ReasoningTestBuilder, TaskMatch } from './framework.mjs';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';

describe('Deductive Syllogism Tests', () => {
  test('should not derive invalid conclusion from unrelated premises', async () => {
    const success = await new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (c --> d) should NOT derive (a --> d)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(c --> d)", undefined, 0.8, 0.8)
      .using(new DeductiveSyllogismRule())
      .notExpect("(a --> d)") // Should not derive this since there's no connection
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should handle multiple inference cycles correctly', async () => {
    const success = await new ReasoningTestBuilder("Syllogistic Reasoning: Multi-step inference (a --> b), (b --> c), (c --> d) should derive (a --> d)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .input("(c --> d)", undefined, 0.7, 0.7)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(a --> c)").withTruth(0.71, 0.51))  // freq=0.9*0.8=0.72, conf=0.72*0.9*0.8=0.5184
      .expect(new TaskMatch("(b --> d)").withTruth(0.55, 0.31))  // freq=0.8*0.7=0.56, conf=0.56*0.8*0.7=0.3136
      .expect(new TaskMatch("(a --> d)").withTruth(0.50, 0.18))  // Based on (a --> c) and (c --> d): freq=0.72*0.7=0.504, conf=0.504*0.5184*0.7=0.182
      .notExpect("(d --> a)")
      .cycles(3)
      .run();

    expect(success).toBe(true);
  });

  test('should handle complex multi-output scenarios', async () => {
    const success = await new ReasoningTestBuilder("Complex Syllogistic Reasoning Test")
      .input("(bird --> animal)", undefined, 0.9, 0.9)
      .input("(robin --> bird)", undefined, 0.95, 0.85)
      .input("(animal --> living_thing)", undefined, 0.8, 0.85)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(robin --> animal)").withTruth(0.85, 0.65))  // freq=0.95*0.9=0.855, conf=0.855*0.85*0.9=0.654
      .expect(new TaskMatch("(bird --> living_thing)").withTruth(0.71, 0.55))  // freq=0.9*0.8=0.72, conf=0.72*0.9*0.85=0.55
      .expect(new TaskMatch("(robin --> living_thing)").withTruth(0.68, 0.40))  // Based on (robin --> animal) and (animal --> living_thing): freq=0.855*0.8=0.684, conf=0.684*0.654*0.85=0.38
      .notExpect("(living_thing --> bird)")  // Wrong direction
      .cycles(3)
      .run();

    expect(success).toBe(true);
  });
});
