/**
 * @file: tests/integration/Foundation.test.js
 * @description: Integration tests for the foundational components (Core, Messages, Rules, Memory).
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import createCore from '../../core/createCore.js';

describe('Core Foundation Integration Test', () => {
  let core;

  beforeEach(async () => {
    core = await createCore();
  });

  afterEach(async () => {
    if (core) {
      await core.stop();
      await core.destroy();
    }
  });

  test('should process an input task and derive a new task via the rules engine', async () => {
    // 1. Define a simple rule using the new API
    const deductionRule = {
      name: 'deduction-A-to-B',
      condition: (context) => context.term.name === 'A',
      action: (context) => {
        const derivedTask = {
          term: { type: 'belief', name: 'B' },
          punctuation: '.',
          truth: context.truth,
          derivedFrom: [context.id],
        };
        core.messages.emit('task.derived', derivedTask);
      },
      priority: 10,
    };

    // 2. Add the rule to the engine
    core.rules.add(deductionRule);

    // 3. Set up a listener for the output (derived task)
    let derivedTask = null;
    const derivedTaskHandler = (task) => {
      derivedTask = task;
    };
    core.messages.on('task.derived', derivedTaskHandler);

    // 4. For this test, we'll listen for an input task and trigger the rules engine.
    core.messages.on('task.input', (task) => {
      core.rules.evaluate(task);
    });

    // 5. Input a task that should trigger the rule
    const inputTask = {
      id: 'task-1',
      term: { type: 'belief', name: 'A' },
      punctuation: '.',
      truth: { frequency: 1.0, confidence: 0.9 },
    };
    core.messages.emit('task.input', inputTask);

    // 6. Assert that the rule was triggered and a new task was derived
    expect(derivedTask).not.toBeNull();
    expect(derivedTask.term.name).toBe('B');
    expect(derivedTask.derivedFrom).toEqual(['task-1']);
  });

  test('should demonstrate enhanced rule pre-filtering and indexing', async () => {
    // Create rules with different types, complexities, and pre-filter tags
    const rules = [
      {
        name: 'simple-deduction',
        type: 'inference',
        complexity: 'simple',
        preFilterTags: ['belief', 'deduction'],
        condition: (ctx) => ctx.term?.name === 'A',
        action: (ctx) => ({ result: 'deduced-B', confidence: ctx.truth?.confidence || 0 }),
        priority: 5
      },
      {
        name: 'complex-induction',
        type: 'inference',
        complexity: 'complex',
        preFilterTags: ['observation', 'pattern'],
        condition: (ctx) => ctx.term?.type === 'pattern',
        action: (ctx) => ({ result: 'induced-pattern', complexity: 'high' }),
        priority: 8
      },
      {
        name: 'low-priority-general',
        type: 'general',
        complexity: 'simple',
        preFilterTags: ['general'],
        condition: (ctx) => true,
        action: (ctx) => ({ result: 'general-response' }),
        priority: 1
      }
    ];

    // Add all rules
    rules.forEach(rule => core.rules.add(rule));

    // Test rule indexing
    const inferenceRules = core.rules.getRulesByType('inference');
    expect(inferenceRules.length).toBe(2);

    const simpleRules = core.rules.getRulesByComplexity('simple');
    expect(simpleRules.length).toBe(2);

    // Test optimized candidate selection
    const context1 = { term: { name: 'A' }, truth: { confidence: 0.9 } };
    const candidates1 = core.rules.getOptimizedRuleCandidates(context1, { ruleType: 'inference' });
    expect(candidates1.length).toBeGreaterThan(0);

    // Test rule evaluation with context
    const result1 = await core.rules.evaluate(context1);
    expect(result1).toBeDefined();
    if (result1 && result1.result === 'deduced-B') {
      expect(result1.confidence).toBe(0.9);
    }
  });

  test('should demonstrate enhanced memory focus sets and attention', async () => {
    // Create focus sets for different attention areas
    core.memory.createFocusSet('working-memory', 5);
    core.memory.createFocusSet('long-term-storage', 10);
    core.memory.createFocusSet('attention-focus', 3);

    // Set current focus
    core.memory.setFocus('working-memory');

    // Add items with different priorities and metadata
    core.memory.set('task-1', { content: 'urgent task', priority: 10 }, {
      type: 'task',
      tags: ['urgent', 'immediate'],
      priority: 10
    });
    core.memory.set('task-2', { content: 'normal task', priority: 5 }, {
      type: 'task',
      tags: ['normal'],
      priority: 5
    });
    core.memory.set('memory-1', { content: 'long term memory', priority: 3 }, {
      type: 'memory',
      tags: ['reference'],
      priority: 3
    });

    // Update focus sets for items
    core.memory._updateFocusSets('task-1', { focusSet: 'working-memory' });
    core.memory._updateFocusSets('task-2', { focusSet: 'working-memory' });
    core.memory._updateFocusSets('memory-1', { focusSet: 'long-term-storage' });

    // Test focus set retrieval with attention scoring
    const focusItems = core.memory.getFocusItems(3);
    expect(focusItems.length).toBeGreaterThan(0);

    // Test attention mechanism
    const stats = core.memory.getFocusSetStats();
    expect(stats['working-memory']).toBeDefined();

    // Update attention
    core.memory.updateFocusAttention('working-memory', 0.5);
    const updatedStats = core.memory.getFocusSetStats();
    expect(updatedStats['working-memory'].attentionScore).toBe(0.5);

    // Test query optimization - search by priority
    const highPriorityItems = core.memory.query({
      minPriority: 8,
      limit: 10
    });
    expect(highPriorityItems.length).toBeGreaterThan(0);

    // Also test basic memory retrieval
    const task1 = core.memory.get('task-1');
    expect(task1.content).toBe('urgent task');
  });

  test('should demonstrate component interaction and performance', async () => {
    const ruleCount = 100;

    // Test bulk rule addition performance
    const addStartTime = Date.now();
    for (let i = 0; i < ruleCount; i++) {
      core.rules.add({
        name: `rule-${i}`,
        type: i % 2 === 0 ? 'inference' : 'general',
        complexity: i % 3 === 0 ? 'complex' : 'simple',
        preFilterTags: [`tag-${i % 5}`],
        condition: (ctx) => ctx?.id === i,
        action: (ctx) => ({ result: `processed-${i}` }),
        priority: Math.floor(i / 10)
      });
    }
    const ruleAddTime = Date.now() - addStartTime;

    // Verify rules were added and system remains functional
    const inferenceRules = core.rules.getRulesByType('inference');
    expect(inferenceRules.length).toBeGreaterThan(0);

    // Test query performance with system metrics
    const queryStartTime = Date.now();
    core.memory.query({ minPriority: 5 });
    const queryTime = Date.now() - queryStartTime;

    // Test rule evaluation performance
    const evalStartTime = Date.now();
    await core.rules.evaluate({ id: 50 });
    const evalTime = Date.now() - evalStartTime;

    // Verify system health after performance test
    const systemHealth = {
      ruleAddTime,
      queryTime,
      evalTime,
      ruleCount: inferenceRules.length,
      memoryStats: core.memory.getStats()
    };

    expect(systemHealth.ruleCount).toBeGreaterThan(0);

    // Add some memory items to ensure storage size is measurable
    core.memory.set('test-item-1', { content: 'test' });
    core.memory.set('test-item-2', { content: 'test2' });

    const updatedMemoryStats = core.memory.getStats();
    expect(updatedMemoryStats.storageSize).toBeGreaterThan(0);

    // Log performance metrics for monitoring (no hard assertions)
    console.log('Performance metrics:', systemHealth);
  });
});