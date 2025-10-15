/**
 * Modus Ponens reasoning tests using Jest framework
 */

import { ReasoningTestBuilder, TaskMatch } from './framework.mjs';
import { ModusPonensRule } from '../../core/reasoning/nal/ModusPonensRule.js';

describe('Modus Ponens Tests', () => {
  test('should derive b from (a ==> b) and a with correct truth value', async () => {
    const success = await new ReasoningTestBuilder("Modus Ponens: (a ==> b) and a should derive b")
      .input("(a ==> b)", undefined, 0.9, 0.9)
      .input("a", undefined, 0.8, 0.8)
      .using(new ModusPonensRule())
      .expect(new TaskMatch("b").withTruth(0.71, 0.64)) // freq=0.9*0.8=0.72, conf=0.9*0.8*0.9=0.648
      .notExpect("a")  // Should not re-derive the input
      .cycles(2)
      .run();

    expect(success).toBe(true);
  });

  test('should not derive without the antecedent', async () => {
    const success = await new ReasoningTestBuilder("Modus Ponens: (a ==> b) without a should NOT derive b")
      .input("(a ==> b)", undefined, 0.9, 0.9)
      // Missing: a
      .using(new ModusPonensRule())
      .notExpect("b")  // Should not be able to derive b without a
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should work with complex terms', async () => {
    const success = await new ReasoningTestBuilder("Modus Ponens with complex terms")
      .input("(sunny_day ==> good_mood)", undefined, 0.85, 0.9)
      .input("sunny_day", undefined, 0.9, 0.85)
      .using(new ModusPonensRule())
      .expect(new TaskMatch("good_mood").withTruth(0.76, 0.64)) // freq=0.85*0.9=0.765, conf=0.85*0.9*0.9=0.6885
      .notExpect("sunny_day")  // Should not re-derive input
      .cycles(2)
      .run();

    expect(success).toBe(true);
  });
});
