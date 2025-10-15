/**
 * LM-based reasoning tests
 */

import { ReasoningTestBuilder } from './framework.mjs';
import { GoalDecompositionRule } from '../../core/reasoning/lm/rules/GoalDecompositionRule.js';
import LM from '../../core/lm/LM.js';

// Mock LM Engine
class MockLMEngine extends LM {
  async process(prompt) {
    if (prompt.includes("Ensure Earth Happiness!")) {
      return JSON.stringify([
        { term: "Ensure Human Well-being!", punctuation: "!", truth: { frequency: 0.9, confidence: 0.9 } },
        { term: "Ensure Environmental Health!", punctuation: "!", truth: { frequency: 0.9, confidence: 0.9 } }
      ]);
    }
    return '[]';
  }
}

describe('LM-based Reasoning Tests', () => {
  test('GoalDecompositionRule should decompose a goal', async () => {
    const testBuilder = new ReasoningTestBuilder("GoalDecompositionRule should decompose a high-priority goal");

    const lm = new MockLMEngine();
    const rule = new GoalDecompositionRule(lm);

    const success = await testBuilder
      .input("Ensure Earth Happiness!", "!", 0.9, 0.9)
      .using(rule)
      .expect("Ensure Human Well-being!")
      .expect("Ensure Environmental Health!")
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });
});
