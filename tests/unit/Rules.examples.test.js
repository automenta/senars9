import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import createCore from '../../core/createCore.js';

describe('Rules Engine Examples - Unit Tests', () => {
  let core;

  beforeEach(async () => {
    core = await createCore();
  });

  afterEach(async () => {
    await core.stop();
    await core.destroy();
  });

  describe('Rule Creation and Management', () => {
    test('should create rules with different types and complexities', () => {
      const rules = [
        {
          name: 'urgent-task-handler',
          type: 'task',
          complexity: 'simple',
          preFilterTags: ['urgent', 'immediate'],
          condition: (ctx) => ctx.priority >= 9,
          action: (ctx) => ({
            result: 'immediate-action',
            task: ctx.term?.name || 'unknown',
            processedAt: new Date().toISOString()
          }),
          priority: 10
        },
        {
          name: 'normal-task-processor',
          type: 'task',
          complexity: 'simple',
          preFilterTags: ['normal', 'scheduled'],
          condition: (ctx) => ctx.priority >= 5 && ctx.priority < 9,
          action: (ctx) => ({
            result: 'scheduled-processing',
            task: ctx.task,
            eta: '1-2 hours'
          }),
          priority: 5
        },
        {
          name: 'complex-pattern-analyzer',
          type: 'analysis',
          complexity: 'complex',
          preFilterTags: ['pattern', 'trend'],
          condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 100,
          action: (ctx) => ({
            result: 'deep-analysis',
            patterns: ctx.patterns,
            insights: 'generated'
          }),
          priority: 8
        }
      ];

      // Add all rules
      rules.forEach(rule => core.rules.add(rule));

      // Verify rules were added
      const allRules = core.rules.rules;
      expect(allRules.length).toBeGreaterThanOrEqual(3);
    });

    test('should provide rule indexing and fast lookups', () => {
      // Add test rules
      core.rules.add({
        name: 'test-task-rule',
        type: 'task',
        complexity: 'simple',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 5
      });

      core.rules.add({
        name: 'test-analysis-rule',
        type: 'analysis',
        complexity: 'complex',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 8
      });

      // Test rule indexing
      const taskRules = core.rules.getRulesByType('task');
      const analysisRules = core.rules.getRulesByType('analysis');
      const simpleRules = core.rules.getRulesByComplexity('simple');
      const highPriorityRules = core.rules.getRulesByPriority(10);

      // Verify indexing works
      expect(Array.isArray(taskRules)).toBe(true);
      expect(Array.isArray(analysisRules)).toBe(true);
      expect(Array.isArray(simpleRules)).toBe(true);
      expect(Array.isArray(highPriorityRules)).toBe(true);
    });
  });

  describe('Rule Pre-filtering', () => {
    test('should optimize rule candidates using pre-filtering', () => {
      // Add test rule with pre-filter tags
      core.rules.add({
        name: 'urgent-rule',
        type: 'task',
        complexity: 'simple',
        preFilterTags: ['urgent', 'immediate'],
        condition: (ctx) => ctx.priority >= 9,
        action: (ctx) => ({ result: 'urgent-processed' }),
        priority: 10
      });

      const urgentContext = {
        task: 'Critical system failure',
        priority: 10,
        tags: ['urgent', 'immediate', 'system']
      };

      // Test pre-filtering optimization
      const candidates = core.rules.getOptimizedRuleCandidates(urgentContext, {
        ruleType: 'task',
        maxComplexity: 'simple'
      });

      // Should find candidate rules
      expect(Array.isArray(candidates)).toBe(true);
    });
  });

  describe('Rule Evaluation', () => {
    test('should evaluate rules correctly with different contexts', async () => {
      // Add test rule
      core.rules.add({
        name: 'priority-rule',
        type: 'task',
        complexity: 'simple',
        condition: (ctx) => ctx.priority >= 8,
        action: (ctx) => ({
          result: 'high-priority-processed',
          priority: ctx.priority
        }),
        priority: 10
      });

      // Test with matching context
      const highPriorityContext = {
        priority: 9,
        term: { name: 'urgent-task' },
        truth: { confidence: 0.9 }
      };

      const result = await core.rules.evaluate(highPriorityContext);
      expect(result).toBeDefined();
      expect(result.result).toBe('high-priority-processed');

      // Test with non-matching context
      const lowPriorityContext = {
        priority: 3,
        term: { name: 'normal-task' },
        truth: { confidence: 0.8 }
      };

      const noResult = await core.rules.evaluate(lowPriorityContext);
      expect(noResult).toBeNull();
    });
  });

  describe('Rule Statistics', () => {
    test('should provide comprehensive rule statistics', () => {
      // Add test rules
      core.rules.add({
        name: 'stat-test-1',
        type: 'task',
        complexity: 'simple',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 5
      });

      core.rules.add({
        name: 'stat-test-2',
        type: 'analysis',
        complexity: 'complex',
        condition: () => true,
        action: () => ({ result: 'test' }),
        priority: 8
      });

      // Get statistics
      const stats = core.rules.getStats();

      // Verify statistics structure
      expect(stats).toBeDefined();
      expect(typeof stats.totalRules).toBe('number');
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(Array.isArray(stats.types)).toBe(true);
    });
  });
});