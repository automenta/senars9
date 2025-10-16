/**
 * NAR API reasoning unit tests
 * Tests the high-level NAR API for robustness and reliability
 */

import { NAR } from '../../core/NAR.js';
import { Punctuation, TruthValue } from '../../core/Task.js';
import { Term } from '../../core/Term.js';
import DummyProvider from '../../core/lm/DummyProvider.js';
import { RuleFactory } from '../../core/reasoning/RuleFactory.js';

describe('NAR API Reasoning Tests', () => {
  test('NAR initializes with both NAL and LM rules loaded', async () => {
    const nar = await new NAR().initialize();
    const stats = nar.reasoner.getStats();

    expect(stats.totalRules).toBeGreaterThan(0);
    expect(stats.ruleTypes).toContain('nal');
    expect(stats.ruleTypes).toContain('lm');
  });

  test('NAR input method creates and stores tasks correctly', async () => {
    const nar = await new NAR().initialize();

    const task = nar.input('test belief.');
    expect(task).toBeDefined();
    expect(task.term.toString()).toBe('"test belief"');
    expect(task.punctuation).toBe(Punctuation.BELIEF);

    const tasks = nar.getTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0]).toBe(task);
  });

  test('NAR string input handles different punctuation correctly', async () => {
    const nar = await new NAR().initialize();

    const belief = nar.input('test belief.');
    const goal = nar.input('test goal!');
    const question = nar.input('test question?');

    expect(belief.punctuation).toBe(Punctuation.BELIEF);
    expect(goal.punctuation).toBe(Punctuation.GOAL);
    expect(question.punctuation).toBe(Punctuation.QUESTION);
  });

  test('NAR ask method creates questions correctly', async () => {
    const nar = await new NAR().initialize();

    const question = nar.ask('What is the answer?');
    expect(question.punctuation).toBe(Punctuation.QUESTION);
    expect(question.term.toString()).toBe('"What is the answer?"');
  });

  test('NAR reasoning cycle derives tasks from inputs', async () => {
    const nar = await new NAR().initialize();

    // Add a premise
    nar.input('cat --> mammal.');

    const derivedTasks = await nar.runCycle();
    expect(Array.isArray(derivedTasks)).toBe(true);

    // Should have at least the original task
    const allTasks = nar.getTasks();
    expect(allTasks.length).toBeGreaterThan(0);

    // Test that reasoning cycle completes without errors
    expect(derivedTasks).toBeDefined();
  });

  test('NAR task filtering methods work correctly', async () => {
    const nar = await new NAR().initialize();

    nar.input('belief statement.');
    nar.input('goal statement!');
    nar.input('question statement?');

    const beliefs = nar.getBeliefs();
    const goals = nar.getGoals();
    const questions = nar.getQuestions();

    expect(beliefs.length).toBe(1);
    expect(goals.length).toBe(1);
    expect(questions.length).toBe(1);

    expect(beliefs[0].punctuation).toBe(Punctuation.BELIEF);
    expect(goals[0].punctuation).toBe(Punctuation.GOAL);
    expect(questions[0].punctuation).toBe(Punctuation.QUESTION);
  });

  test('NAR priority-based task retrieval works correctly', async () => {
    const nar = await new NAR().initialize();

    // Add tasks with different priorities
    const lowPriority = nar.input({ term: 'low priority', priority: 0.1 });
    const highPriority = nar.input({ term: 'high priority', priority: 0.9 });

    const tasksByPriority = nar.getTasksByPriority();
    expect(tasksByPriority[0]).toBe(highPriority);
    expect(tasksByPriority[1]).toBe(lowPriority);
  });

  test('NAR LM provider integration works correctly', async () => {
    const nar = await new NAR().initialize();

    // Register dummy provider for testing
    const provider = new DummyProvider();
    nar.lm.registerProvider('test', provider);

    // Test LM-based reasoning with goal decomposition
    const goal = nar.input('Develop a comprehensive project plan!');
    await nar.runCycle();

    // Should have the original goal at minimum
    const tasks = nar.getTasks();
    expect(tasks.length).toBeGreaterThan(0);

    // Test that LM provider is registered correctly
    expect(nar.lm.providers.test).toBeDefined();
  });

  test('NAR memory state tracking works correctly', async () => {
    const nar = await new NAR().initialize();

    const initialState = nar.getMemoryState();
    expect(initialState.totalTasks).toBe(0);

    nar.input('test task.');
    const afterInputState = nar.getMemoryState();
    expect(afterInputState.totalTasks).toBe(1);
    expect(afterInputState.beliefs).toBe(1);
  });

  test('NAR handles malformed input gracefully', async () => {
    const nar = await new NAR().initialize();

    expect(() => {
      nar.input(null);
    }).toThrow();

    expect(() => {
      nar.input(undefined);
    }).toThrow();
  });

  test('NAR task removal works correctly', async () => {
    const nar = await new NAR().initialize();

    const task = nar.input('task to remove.');
    const taskHash = task.hashCode();

    expect(nar.getTasks().length).toBe(1);

    nar.removeTask(taskHash);
    expect(nar.getTasks().length).toBe(0);
  });

  test('NAR reset functionality works correctly', async () => {
    const nar = await new NAR().initialize();

    nar.input('test task.');
    expect(nar.getTasks().length).toBe(1);

    nar.reset();
    expect(nar.getTasks().length).toBe(0);
  });

  test('NAR continuous operation start/stop works correctly', async () => {
    const nar = await new NAR().initialize();

    expect(nar.isRunning()).toBe(false);

    nar.start();
    expect(nar.isRunning()).toBe(true);

    nar.stop();
    expect(nar.isRunning()).toBe(false);
  });

  test('NAR handles concurrent reasoning cycles correctly', async () => {
    const nar = await new NAR().initialize();

    nar.input('cat --> mammal.');
    nar.input('mammal --> animal.');

    // Run multiple cycles concurrently
    const promises = Array(3).fill().map(() => nar.runCycle());
    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test('NAR concept tracking works correctly', async () => {
    const nar = await new NAR().initialize();

    nar.input('cat --> mammal.');
    nar.input('dog --> mammal.');

    const concepts = nar.getConcepts();
    expect(concepts.length).toBeGreaterThan(0);

    // Test that concepts are being tracked
    const conceptNames = concepts.map(c => c.term?.toString()).filter(Boolean);
    expect(conceptNames.length).toBeGreaterThan(0);
  });

  test('NAR handles empty focus set gracefully', async () => {
    const nar = await new NAR().initialize();

    // No inputs, should handle gracefully
    const derivedTasks = await nar.runCycle();
    expect(Array.isArray(derivedTasks)).toBe(true);
    expect(derivedTasks.length).toBe(0);
  });

  test('NAR rule performance metrics are tracked', async () => {
    const nar = await new NAR().initialize();

    nar.input('cat --> mammal.');

    await nar.runCycle();

    const stats = nar.reasoner.getStats();
    expect(stats.performance).toBeDefined();
    expect(typeof stats.performance.totalExecutions).toBe('number');
  });
});