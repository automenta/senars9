/**
 * Syllogistic reasoning tests using the new TestNAR framework.
 */

import { TestNAR, TaskMatch } from './TestNAR.js';

describe('Syllogistic Reasoning Tests (with new TestNAR)', () => {
  it('should derive (a --> c) from (a --> b) and (b --> c) with correct truth value', async () => {
    const result = await new TestNAR()
      .input('(a --> b)', 0.9, 0.9)
      .input('(b --> c)', 0.8, 0.8)
      .run(2) // Run for 2 cycles to ensure rule has a chance to fire
      .expect(new TaskMatch('(a --> c)').withTruth(0.71, 0.51)) // freq=0.9*0.8=0.72, conf=0.9*0.8*0.9*0.8=0.5184. Rounded down.
      .expectNot('(c --> a)')
      .execute();

    expect(result).toBe(true);
  });
});