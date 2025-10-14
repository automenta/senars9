/**
 * Modus Ponens reasoning tests using Jest framework
 */

import { ReasoningTestBuilder, createReasoner } from './framework.mjs';
import { ModusPonens } from '../../core/reasoning/ModusPonensRule.js';

describe('Modus Ponens Tests', () => {
  test('should derive b from (a ==> b) and a', () => {
    const success = new ReasoningTestBuilder("Modus Ponens: (a ==> b) and a should derive b")
      .input("(a ==> b)", undefined, 0.9, 0.9)
      .input("a", undefined, 0.8, 0.8)
      .using(createReasoner(ModusPonens))
      .expect("b")
      .notExpect("a")  // Should not re-derive the input
      .cycles(2)
      .run();

    expect(success).toBe(true);
  });

  test('should not derive without the antecedent', () => {
    const success = new ReasoningTestBuilder("Modus Ponens: (a ==> b) without a should NOT derive b")
      .input("(a ==> b)", undefined, 0.9, 0.9)
      // Missing: a
      .using(createReasoner(ModusPonens))
      .notExpect("b")  // Should not be able to derive b without a
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should work with complex terms', () => {
    const success = new ReasoningTestBuilder("Modus Ponens with complex terms")
      .input("(sunny_day ==> good_mood)", undefined, 0.85, 0.9)
      .input("sunny_day", undefined, 0.9, 0.85)
      .using(createReasoner(ModusPonens))
      .expect("good_mood")
      .notExpect("sunny_day")  // Should not re-derive input
      .cycles(2)
      .run();

    expect(success).toBe(true);
  });
});