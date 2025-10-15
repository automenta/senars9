/**
 * Tests for detailed expectations using the TaskMatch builder
 */

import { ReasoningTestBuilder, TaskMatch } from './framework.mjs';
import { DeductiveSyllogismRule } from '../../core/reasoning/nal/SyllogisticRules.js';
import { Punctuation } from '../../core/Task.js';

describe('Detailed Expectation Tests', () => {
  test('should correctly verify punctuation of derived tasks', async () => {
    const success = await new ReasoningTestBuilder("Should derive a task with GOAL punctuation")
      .input("(a --> b)", Punctuation.GOAL, 0.9, 0.9)
      .input("(b --> c)", Punctuation.GOAL, 0.8, 0.8)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(a --> c)").withPunctuation(Punctuation.GOAL))
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should correctly verify truth values of derived tasks', async () => {
    const success = await new ReasoningTestBuilder("Should derive a task with a specific truth value")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(a --> c)").withTruth(0.71, 0.51)) // freq=0.9*0.8=0.72, conf=0.72*0.9*0.8=0.5184
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });

  test('should correctly verify occurrence time of derived tasks', async () => {
    const startTime = Date.now();

    const success = await new ReasoningTestBuilder("Should derive a task that occurred after the test start time")
      .input("(a --> b)", undefined, 0.9, 0.9)
      .input("(b --> c)", undefined, 0.8, 0.8)
      .using(new DeductiveSyllogismRule())
      .expect(new TaskMatch("(a --> c)").after(startTime))
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });
});
