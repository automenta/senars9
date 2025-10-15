/**
 * Comprehensive Syllogistic reasoning tests using Jest framework
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';

describe('Deductive Syllogism Tests', () => {
  test('should not derive invalid conclusion from unrelated premises', async () => {
    const success = await new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (c --> d) should NOT derive (a --> d)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(c --> d)", undefined, 0.8, 0.8)
      .using(createReasoner(DeductiveSyllogismRule))
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
      .using(createReasoner(DeductiveSyllogismRule))
      .expect("(a --> c)")  // First step: a->b + b->c = a->c
      .expect("(b --> d)")  // Second step: b->c + c->d = b->d
      .expect("(a --> d)")  // Third step: a->c + c->d = a->d (or through other paths)
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
      .using(createReasoner(DeductiveSyllogismRule))
      .expect("(robin --> animal)")  // robin -> bird -> animal
      .expect("(bird --> living_thing)")  // bird -> animal -> living_thing
      .expect("(robin --> living_thing)")  // robin -> bird -> living_thing (or through animal)
      .notExpect("(living_thing --> bird)")  // Wrong direction
      .cycles(3)
      .run();

    expect(success).toBe(true);
  });
});