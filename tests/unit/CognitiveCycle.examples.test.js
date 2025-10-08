import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import createCore from '../../core/createCore.js';

describe('Cognitive Cycle Examples - Unit Tests', () => {
  let core;

  beforeEach(async () => {
    core = await createCore();
  });

  afterEach(async () => {
    await core.stop();
    await core.destroy();
  });

  describe('Cognitive Environment Setup', () => {
    test('should set up focus sets for cognitive processes', () => {
      // Create focus sets for different cognitive processes
      core.memory.createFocusSet('perception-buffer', 10);
      core.memory.createFocusSet('working-memory', 8);
      core.memory.createFocusSet('reasoning-focus', 5);
      core.memory.createFocusSet('learning-storage', 20);

      // Set initial focus
      core.memory.setFocus('perception-buffer');

      // Verify setup
      const currentFocus = core.memory.getCurrentFocus();
      expect(currentFocus).toBe('perception-buffer');
    });

    test('should create cognitive processing rules', () => {
      const cognitiveRules = [
        {
          name: 'perception-filter',
          type: 'perception',
          complexity: 'simple',
          preFilterTags: ['input', 'observation'],
          condition: (ctx) => ctx.inputType === 'observation' && ctx.confidence > 0.7,
          action: (ctx) => {
            core.memory.set(`obs-${Date.now()}`, ctx.observation, {
              type: 'observation',
              tags: ['perceived', 'filtered'],
              priority: Math.floor(ctx.confidence * 10)
            });
            return { result: 'perceived', stored: true };
          },
          priority: 9
        },
        {
          name: 'pattern-recognition',
          type: 'reasoning',
          complexity: 'complex',
          preFilterTags: ['pattern', 'analysis'],
          condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 50,
          action: (ctx) => {
            const insights = {
              pattern: ctx.pattern,
              confidence: ctx.confidence,
              implications: ['trend-detected', 'action-required'],
              generatedAt: new Date().toISOString()
            };

            core.memory.set(`insight-${Date.now()}`, insights, {
              type: 'insight',
              tags: ['pattern', 'analysis', 'generated'],
              priority: 8
            });

            return { result: 'pattern-analyzed', insights };
          },
          priority: 8
        }
      ];

      // Add cognitive rules
      cognitiveRules.forEach(rule => core.rules.add(rule));

      // Verify rules were added
      const allRules = core.rules.rules;
      expect(allRules.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cognitive Cycle Simulation', () => {
    test('should process perception phase correctly', async () => {
      // Add perception rule
      core.rules.add({
        name: 'perception-rule',
        type: 'perception',
        complexity: 'simple',
        condition: (ctx) => ctx.inputType === 'observation' && ctx.confidence > 0.7,
        action: (ctx) => {
          core.memory.set(`obs-${Date.now()}`, ctx.observation, {
            type: 'observation',
            tags: ['perceived'],
            priority: Math.floor(ctx.confidence * 10)
          });
          return { result: 'perceived', stored: true };
        },
        priority: 9
      });

      // Test perception
      const observations = [
        {
          inputType: 'observation',
          confidence: 0.9,
          observation: { sensor: 'temperature', value: 85, unit: 'celsius', location: 'server-room' }
        },
        {
          inputType: 'observation',
          confidence: 0.6,
          observation: { sensor: 'humidity', value: 45, unit: 'percent', location: 'server-room' }
        }
      ];

      for (const obs of observations) {
        const result = await core.rules.evaluate(obs);
        if (result && obs.confidence > 0.7) {
          expect(result.result).toBe('perceived');
          expect(result.stored).toBe(true);
        }
      }
    });

    test('should process pattern recognition phase correctly', async () => {
      // Add pattern recognition rule
      core.rules.add({
        name: 'pattern-rule',
        type: 'reasoning',
        complexity: 'complex',
        condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 50,
        action: (ctx) => {
          const insights = {
            pattern: ctx.pattern,
            confidence: ctx.confidence,
            implications: ['trend-detected'],
            generatedAt: new Date().toISOString()
          };

          core.memory.set(`insight-${Date.now()}`, insights, {
            type: 'insight',
            tags: ['pattern', 'analysis'],
            priority: 8
          });

          return { result: 'pattern-analyzed', insights };
        },
        priority: 8
      });

      // Test pattern recognition
      const patternData = {
        dataType: 'pattern',
        size: 120,
        pattern: { type: 'temperature-trend', direction: 'increasing', rate: 2.5 },
        confidence: 0.85
      };

      const patternResult = await core.rules.evaluate(patternData);
      expect(patternResult).toBeDefined();
      expect(patternResult.result).toBe('pattern-analyzed');
      expect(patternResult.insights).toBeDefined();
    });

    test('should process decision making phase correctly', async () => {
      // Add decision making rule
      core.rules.add({
        name: 'decision-rule',
        type: 'decision',
        complexity: 'medium',
        condition: (ctx) => ctx.requiresAction && ctx.urgency > 7,
        action: (ctx) => {
          const decision = {
            action: ctx.recommendedAction,
            reasoning: ctx.reasoning,
            confidence: ctx.confidence,
            timestamp: new Date().toISOString()
          };

          core.memory.set(`decision-${Date.now()}`, decision, {
            type: 'decision',
            tags: ['action', 'decision'],
            priority: 10
          });

          return { result: 'decision-made', decision };
        },
        priority: 10
      });

      // Test decision making
      const decisionContext = {
        requiresAction: true,
        urgency: 9,
        recommendedAction: 'activate-cooling-system',
        reasoning: 'Temperature trend indicates overheating risk',
        confidence: 0.9
      };

      const decisionResult = await core.rules.evaluate(decisionContext);
      expect(decisionResult).toBeDefined();
      expect(decisionResult.result).toBe('decision-made');
      expect(decisionResult.decision).toBeDefined();
    });

    test('should process learning phase correctly', async () => {
      // Add learning rule
      core.rules.add({
        name: 'learning-rule',
        type: 'learning',
        complexity: 'simple',
        condition: (ctx) => ctx.experience && ctx.outcome,
        action: (ctx) => {
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
        },
        priority: 6
      });

      // Test learning
      const learningExperience = {
        experience: 'temperature-monitoring',
        outcome: 'cooling-activated',
        usefulness: 0.9
      };

      const learningResult = await core.rules.evaluate(learningExperience);
      expect(learningResult).toBeDefined();
      expect(learningResult.result).toBe('learned');
      expect(learningResult.stored).toBe(true);
    });
  });

  describe('Memory Integration', () => {
    test('should integrate memory across cognitive cycle', async () => {
      // Add some test data to memory
      core.memory.set('test-observation', { sensor: 'test' }, { type: 'observation' });
      core.memory.set('test-insight', { pattern: 'test' }, { type: 'insight' });
      core.memory.set('test-decision', { action: 'test' }, { type: 'decision' });

      // Query for different types
      const observations = core.memory.query({ type: 'observation', limit: 5 });
      const insights = core.memory.query({ type: 'insight', limit: 5 });
      const decisions = core.memory.query({ type: 'decision', limit: 5 });

      // Verify queries work
      expect(Array.isArray(observations)).toBe(true);
      expect(Array.isArray(insights)).toBe(true);
      expect(Array.isArray(decisions)).toBe(true);
    });

    test('should manage attention dynamics during cognitive cycle', () => {
      // Create focus sets
      core.memory.createFocusSet('perception-buffer', 10);
      core.memory.createFocusSet('working-memory', 8);
      core.memory.createFocusSet('reasoning-focus', 5);
      core.memory.createFocusSet('learning-storage', 20);

      // Update attention based on cognitive activity
      core.memory.updateFocusAttention('perception-buffer', 0.3);
      core.memory.updateFocusAttention('working-memory', 0.8);
      core.memory.updateFocusAttention('reasoning-focus', 0.7);
      core.memory.updateFocusAttention('learning-storage', 0.5);

      // Get attention stats
      const attentionStats = core.memory.getFocusSetStats();

      // Verify attention distribution
      expect(attentionStats['working-memory']).toBeDefined();
      expect(attentionStats['reasoning-focus']).toBeDefined();
    });
  });

  describe('Performance Summary', () => {
    test('should provide cognitive cycle performance metrics', () => {
      // Add some test rules and memory items
      core.rules.add({
        name: 'perf-test-rule',
        type: 'test',
        complexity: 'simple',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 5
      });

      core.memory.set('perf-test-item', { content: 'test' });

      // Get performance metrics
      const ruleStats = core.rules.getStats();
      const memoryStats = core.memory.getStats();

      // Verify metrics structure
      expect(ruleStats).toBeDefined();
      expect(memoryStats).toBeDefined();
      expect(typeof ruleStats.totalRules).toBe('number');
      expect(typeof memoryStats.storageSize).toBe('number');
    });
  });
});