import { ReasoningTestBuilder, TaskMatch } from './framework.mjs';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';

describe('Syllogistic Reasoning Tests', () => {
  test('should derive (a --> c) from (a --> b) and (b --> c) with correct truth value', async () => {
    const success = await new ReasoningTestBuilder("Syllogistic Reasoning: (a --> b) and (b --> c) should derive (a --> c)")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(a --> c)").withTruth(0.71, 0.51))
      .notExpect("(c --> a)")
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });
});
