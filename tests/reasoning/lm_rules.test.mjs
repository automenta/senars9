/**
 * LM-based reasoning tests
 */

import { createGoalDecompositionRule } from '../../core/reasoning/lm/rules/GoalDecompositionRule.js';
import { Punctuation } from '../../core/Task.js';
import LM from '../../core/lm/LM.js';
import { Term } from '../../core/Term.js';
import { Task } from '../../core/Task.js';
import { TruthValue } from '../../core/Task.js';

// Simple test provider that returns mock responses
class TestProvider {
  async process(prompt, options = {}) {
    if (prompt.includes("Decompose the following high-level goal")) {
      if (prompt.includes('create a comprehensive marketing plan for a new product')) {
        return `1. Research target audience
2. Develop marketing materials
3. Launch social media campaign`;
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
  test('createGoalDecompositionRule should decompose a goal', async () => {
    const lm = new TestLM();
    const rule = createGoalDecompositionRule({ lm });
    const goalTerm = Term.newAtom('create a comprehensive marketing plan for a new product');
    const goal = new Task(goalTerm, Punctuation.GOAL, new TruthValue(0.9, 0.9), Date.now(), Date.now(), 0.9);
    const context = { premise: { task: goal } };
    const result = await rule.apply(context);
    expect(result.length).toBe(3);
    expect(result[0].term.toString()).toBe('"Research target audience"');
    expect(result[1].term.toString()).toBe('"Develop marketing materials"');
    expect(result[2].term.toString()).toBe('"Launch social media campaign"');
  });
});