import { describe, test, expect } from '@jest/globals';
import { Task, Term, Punctuation, TruthValue } from '../../core/index.js';
import {
  withCoreSetup,
  createTestRules,
  createTestMemoryItems,
  expectRuleFired,
  expectMemoryItem,
  testBulkOperations
} from '../unit/enhanced-test-utils.js';

describe('Core Foundation Integration Test', () => {

  test('should process an input task and derive a new task via the rules engine', withCoreSetup(async (core) => {
    // Setup rule using consolidated utility
    const deductionRule = createTestRules.deduction(
      (context) => context.term.name === 'A',
      (context) => {
        const derivedTask = {
          term: { type: 'belief', name: 'B' },
          punctuation: '.',
          truth: context.truth,
          derivedFrom: [context.id],
        };
        core.messages.emit('task.derived', derivedTask);
      },
      10
    );
    core.rules.add(deductionRule);

    // Setup listener for derived task
    let derivedTask = null;
    core.messages.on('task.derived', (task) => { derivedTask = task; });

    // Setup input handler
    core.messages.on('task.input', (task) => { core.rules.evaluate(task); });

    // Input test task
    const inputTask = {
      id: 'task-1',
      term: { type: 'belief', name: 'A' },
      punctuation: '.',
      truth: { frequency: 1.0, confidence: 0.9 },
    };
    core.messages.emit('task.input', inputTask);

    // Assertions
    expect(derivedTask).not.toBeNull();
    expect(derivedTask.term.name).toBe('B');
    expect(derivedTask.derivedFrom).toEqual(['task-1']);
  }));

  test('should demonstrate enhanced rule pre-filtering and indexing', withCoreSetup(async (core) => {
    // Create rules using consolidated utilities
    const rules = [
      createTestRules.simple({
        name: 'simple-deduction',
        type: 'inference',
        complexity: 'simple',
        preFilterTags: ['belief', 'deduction'],
        condition: (ctx) => ctx.term?.name === 'A',
        action: (ctx) => ({ result: 'deduced-B', confidence: ctx.truth?.confidence || 0 }),
        priority: 5
      }),
      createTestRules.simple({
        name: 'complex-induction',
        type: 'inference',
        complexity: 'complex',
        preFilterTags: ['observation', 'pattern'],
        condition: (ctx) => ctx.term?.type === 'pattern',
        action: (ctx) => ({ result: 'induced-pattern', complexity: 'high' }),
        priority: 8
      }),
      createTestRules.simple({
        name: 'low-priority-general',
        type: 'general',
        complexity: 'simple',
        preFilterTags: ['general'],
        condition: (ctx) => true,
        action: (ctx) => ({ result: 'general-response' }),
        priority: 1
      })
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
  }));

  test('should demonstrate enhanced memory focus sets and attention', withCoreSetup(async (core) => {
    // Create focus sets for different attention areas
    core.focus.createFocusSet('working-memory', 5);
    core.focus.createFocusSet('long-term-storage', 10);
    core.focus.createFocusSet('attention-focus', 3);

    // Set current focus
    core.focus.setFocus('working-memory');

    // Create and add proper Task objects
    const task1 = new Task(
      new Term('urgent task'),
      Punctuation.GOAL,
      new TruthValue(0.9, 0.9),
      Date.now(),
      Date.now(),
      1.0 // High priority
    );
    const task2 = new Task(
      new Term('normal task'),
      Punctuation.GOAL,
      new TruthValue(0.7, 0.7),
      Date.now(),
      Date.now(),
      0.5 // Medium priority
    );
    const task3 = new Task(
      new Term('long term memory'),
      Punctuation.BELIEF,
      new TruthValue(0.5, 0.5),
      Date.now(),
      Date.now(),
      0.2 // Low priority
    );

    // Add tasks to memory, which will in turn add them to the current focus set
    core.memory.addTask(task1);
    core.memory.addTask(task2);

    // Switch focus and add the third task
    core.focus.setFocus('long-term-storage');
    core.memory.addTask(task3);

    // Switch back to working-memory to test retrieval
    core.focus.setFocus('working-memory');

    // Test focus set retrieval with attention scoring
    const focusItems = core.focus.getFocusItems(3);
    expect(focusItems.length).toBeGreaterThan(0);

    // Test attention mechanism
    const stats = core.focus.getFocusSetStats();
    expect(stats['working-memory']).toBeDefined();

    // Update attention
    core.focus.updateFocusAttention('working-memory', 0.5);
    const updatedStats = core.focus.getFocusSetStats();
    expect(updatedStats['working-memory'].attentionScore).toBe(0.5);
  }));

  test('should demonstrate component interaction and performance', withCoreSetup(async (core) => {
    const ruleCount = 100;

    // Test bulk rule addition performance using consolidated utility
    const ruleAddTime = await testBulkOperations(
      async (i) => {
        core.rules.add(createTestRules.simple({
          name: `rule-${i}`,
          type: i % 2 === 0 ? 'inference' : 'general',
          complexity: i % 3 === 0 ? 'complex' : 'simple',
          preFilterTags: [`tag-${i % 5}`],
          condition: (ctx) => ctx?.id === i,
          action: (ctx) => ({ result: `processed-${i}` }),
          priority: Math.floor(i / 10)
        }));
      },
      ruleCount,
      'rule-addition'
    );

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
    const testItem1 = createTestMemoryItems.task('test');
    const testItem2 = createTestMemoryItems.task('test2');
    core.memory.set(testItem1.key, testItem1.value, testItem1.options);
    core.memory.set(testItem2.key, testItem2.value, testItem2.options);

    const updatedMemoryStats = core.memory.getStats();
    expect(updatedMemoryStats.storageSize).toBeGreaterThan(0);
  }));
});