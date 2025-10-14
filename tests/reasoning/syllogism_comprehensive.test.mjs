/**
 * Comprehensive Syllogistic reasoning tests using Jest framework
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { DeductiveSyllogism } from '../../core/reasoning/SyllogisticRules.js';

describe('Deductive Syllogism Tests', () => {
  test('should derive (a --> c) from (a --> b) and (b --> c)', () => {
    const success = new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (b --> c) should derive (a --> c)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(createReasoner(DeductiveSyllogism))
      .expect("(a --> c)")
      .notExpect("(c --> a)")
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should not derive invalid conclusion from unrelated premises', () => {
    const success = new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (c --> d) should NOT derive (a --> d)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(c --> d)", undefined, 0.8, 0.8)
      .using(createReasoner(DeductiveSyllogism))
      .notExpect("(a --> d)") // Should not derive this since there's no connection
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should handle multiple inference cycles correctly', () => {
    const success = new ReasoningTestBuilder("Syllogistic Reasoning: Multi-step inference (a --> b), (b --> c), (c --> d) should derive (a --> d)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .input("(c --> d)", undefined, 0.7, 0.7)
      .using(createReasoner(DeductiveSyllogism))
      .expect("(a --> c)")  // First step: a->b + b->c = a->c
      .expect("(b --> d)")  // Second step: b->c + c->d = b->d
      .expect("(a --> d)")  // Third step: a->c + c->d = a->d (or through other paths)
      .notExpect("(d --> a)")
      .cycles(3)
      .run();

    expect(success).toBe(true);
  });

  test('should handle complex multi-output scenarios', () => {
    const success = new ReasoningTestBuilder("Complex Syllogistic Reasoning Test")
      .input("(bird --> animal)", undefined, 0.9, 0.9)
      .input("(robin --> bird)", undefined, 0.95, 0.85)
      .input("(animal --> living_thing)", undefined, 0.8, 0.85)
      .using(createReasoner(DeductiveSyllogism))
      .expect("(robin --> animal)")  // robin -> bird -> animal
      .expect("(bird --> living_thing)")  // bird -> animal -> living_thing
      .expect("(robin --> living_thing)")  // robin -> bird -> living_thing (or through animal)
      .notExpect("(living_thing --> bird)")  // Wrong direction
      .cycles(3)
      .run();

    expect(success).toBe(true);
  });
});