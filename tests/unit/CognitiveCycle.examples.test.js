import { describe, test, expect } from '@jest/globals';
import {
  withCoreSetup,
  createTestRules,
  createTestMemoryItems,
  expectRuleFired,
  cognitiveCycleScenarios
} from './enhanced-test-utils.js';

describe('Cognitive Cycle Examples - Unit Tests', () => {

  describe('Cognitive Environment Setup', () => {
    test('should set up focus sets for cognitive processes', withCoreSetup(async (core) => {
      // Create focus sets for different cognitive processes
      core.memory.focus.createFocusSet('perception-buffer', 10);
      core.memory.focus.createFocusSet('working-memory', 8);
      core.memory.focus.createFocusSet('reasoning-focus', 5);
      core.memory.focus.createFocusSet('learning-storage', 20);

      // Set initial focus
      core.memory.focus.setFocus('perception-buffer');

      // Verify setup
      const currentFocus = core.memory.focus.getCurrentFocus();
      expect(currentFocus).toBe('perception-buffer');
    }));

    test('should create cognitive processing rules', withCoreSetup(async (core) => {
      const cognitiveRules = [
        createTestRules.cognitive('perception', 'simple'),
        createTestRules.cognitive('reasoning', 'complex')
      ];

      // Add cognitive rules
      cognitiveRules.forEach(rule => core.rules.add(rule));

      // Verify rules were added
      const allRules = core.rules.rules;
      expect(allRules.length).toBeGreaterThanOrEqual(2);
    }));
  });

  describe('Cognitive Cycle Simulation', () => {
    test('should process perception phase correctly', withCoreSetup(async (core) => {
      // Use consolidated cognitive scenario
      const scenario = cognitiveCycleScenarios.perception(core);

      // Test perception with multiple observations
      const observations = [
        {
          ...scenario.input,
          observation: { sensor: 'temperature', value: 85, unit: 'celsius', location: 'server-room' }
        },
        {
          ...scenario.input,
          confidence: 0.6,
          observation: { sensor: 'humidity', value: 45, unit: 'percent', location: 'server-room' }
        }
      ];

      for (const obs of observations) {
        const result = await core.rules.evaluate(obs);
        if (result && obs.confidence > 0.7) {
          expectRuleFired(result, scenario.expectedResult);
          expect(result.stored).toBe(true);
        }
      }
    }));

    test('should process pattern recognition phase correctly', withCoreSetup(async (core) => {
      // Use consolidated cognitive scenario
      const scenario = cognitiveCycleScenarios.patternRecognition(core);

      // Test pattern recognition
      const patternResult = await core.rules.evaluate(scenario.input);
      expectRuleFired(patternResult, scenario.expectedResult);
      expect(patternResult.insights).toBeDefined();
    }));

    test('should process decision making phase correctly', withCoreSetup(async (core) => {
      // Use consolidated cognitive scenario
      const scenario = cognitiveCycleScenarios.decision(core);

      // Test decision making
      const decisionResult = await core.rules.evaluate(scenario.input);
      expectRuleFired(decisionResult, scenario.expectedResult);
      expect(decisionResult.decision).toBeDefined();
    }));

    test('should process learning phase correctly', withCoreSetup(async (core) => {
      // Create learning rule using consolidated utility
      const learningRule = createTestRules.cognitive('learning', 'simple');
      learningRule.condition = (ctx) => ctx.experience && ctx.outcome;
      learningRule.action = (ctx) => {
        const learning = {
          experience: ctx.experience,
          outcome: ctx.outcome,
          learnedAt: new Date().toISOString(),
          usefulness: ctx.usefulness || 0.5
        };

        core.memory.set(`learning-${Date.now()}`, learning, {
          type: 'learning',
          tags: ['experience', 'knowledge'],
          priority: Math.floor((ctx.usefulness || 0.5) * 8)
        });

        return { result: 'learned', stored: true };
      };
      learningRule.priority = 6;
      core.rules.add(learningRule);

      // Test learning
      const learningExperience = {
        experience: 'temperature-monitoring',
        outcome: 'cooling-activated',
        usefulness: 0.9
      };

      const learningResult = await core.rules.evaluate(learningExperience);
      expectRuleFired(learningResult, 'learned');
      expect(learningResult.stored).toBe(true);
    }));
  });

  describe('Memory Integration', () => {
    test('should integrate memory across cognitive cycle', withCoreSetup(async (core) => {
      // Add some test data to memory using consolidated utilities
      const obsItem = createTestMemoryItems.observation('test', 100);
      const insightItem = createTestMemoryItems.pattern({ type: 'test' });
      const decisionItem = createTestMemoryItems.task('test decision');

      core.memory.set(obsItem.key, obsItem.value, obsItem.options);
      core.memory.set(insightItem.key, insightItem.value, insightItem.options);
      core.memory.set(decisionItem.key, decisionItem.value, { ...decisionItem.options, type: 'decision' });

      // Query for different types
      const observations = core.memory.query({ type: 'observation', limit: 5 });
      const insights = core.memory.query({ type: 'insight', limit: 5 });
      const decisions = core.memory.query({ type: 'decision', limit: 5 });

      // Verify queries work
      expect(Array.isArray(observations)).toBe(true);
      expect(Array.isArray(insights)).toBe(true);
      expect(Array.isArray(decisions)).toBe(true);
    }));

    test('should manage attention dynamics during cognitive cycle', withCoreSetup(async (core) => {
      // Create focus sets
      core.memory.focus.createFocusSet('perception-buffer', 10);
      core.memory.focus.createFocusSet('working-memory', 8);
      core.memory.focus.createFocusSet('reasoning-focus', 5);
      core.memory.focus.createFocusSet('learning-storage', 20);

      // Update attention based on cognitive activity
      core.memory.focus.updateFocusAttention('perception-buffer', 0.3);
      core.memory.focus.updateFocusAttention('working-memory', 0.8);
      core.memory.focus.updateFocusAttention('reasoning-focus', 0.7);
      core.memory.focus.updateFocusAttention('learning-storage', 0.5);

      // Get attention stats
      const attentionStats = core.memory.focus.getFocusSetStats();

      // Verify attention distribution
      expect(attentionStats['working-memory']).toBeDefined();
      expect(attentionStats['reasoning-focus']).toBeDefined();
    }));
  });

  describe('Performance Summary', () => {
    test('should provide cognitive cycle performance metrics', withCoreSetup(async (core) => {
      // Add some test rules and memory items using consolidated utilities
      const testRule = createTestRules.simple({
        name: 'perf-test-rule',
        type: 'test',
        complexity: 'simple',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 5
      });
      core.rules.add(testRule);

      const testItem = createTestMemoryItems.task('test');
      core.memory.set(testItem.key, testItem.value, testItem.options);

      // Get performance metrics
      const ruleStats = core.rules.getStats();
      const memoryStats = core.memory.getStats();

      // Verify metrics structure
      expect(ruleStats).toBeDefined();
      expect(memoryStats).toBeDefined();
      expect(typeof ruleStats.totalRules).toBe('number');
      expect(typeof memoryStats.storageSize).toBe('number');
    }));
  });
});