/**
 * LM-based reasoning tests
 */

import { ReasoningTestBuilder, TaskMatch } from './framework.mjs';
import { GoalDecompositionRule } from '../../core/reasoning/lm/rules/GoalDecompositionRule.js';
import { Punctuation } from '../../core/Task.js';
import LM from '../../core/lm/LM.js';

// Simple test provider that returns mock responses
class TestProvider {
  async process(prompt, options = {}) {
    if (prompt.includes("Decompose this goal into")) {
      if (prompt.includes('"Ensure Earth Happiness"')) {
        return `- "Ensure Human Well-being"!
- "Ensure Environmental Health"!`;
      }
    }
    return "No sub-goals identified.";
  }
  
  async generateText(prompt, options = {}) {
    return this.process(prompt, options);
  }
}

// Simple LM for testing with a real provider registered
class TestLM extends LM {
  constructor() {
    super();
    // Register a test provider directly
    this.registerProvider('test', new TestProvider());
    this.providers.defaultProviderId = 'test';
  }
}

describe('LM-based Reasoning Tests', () => {
  test('GoalDecompositionRule should decompose a goal', async () => {
    const testBuilder = new ReasoningTestBuilder("GoalDecompositionRule should decompose a high-priority goal");

    const lm = new TestLM();
    const rule = new GoalDecompositionRule(lm);

    const success = await testBuilder
      .input('"Ensure Earth Happiness"!', Punctuation.GOAL, 0.9, 0.9)
      .using(rule)
      .expect(new TaskMatch('"Ensure Human Well-being"').withPunctuation(Punctuation.BELIEF))
      .expect(new TaskMatch('"Ensure Environmental Health"').withPunctuation(Punctuation.BELIEF))
      .cycles(1)
      .run();

    expect(success).toBe(true);
  });
});
