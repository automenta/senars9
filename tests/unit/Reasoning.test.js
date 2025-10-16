/**
 * @file: tests/unit/Reasoning.test.js
 * @description: Unit tests for the Reasoning component.
 */

import { jest } from '@jest/globals';
import { Reasoner } from '../../core/Reasoner.js';

// Mock Memory class for testing purposes
class MockMemory {
  constructor() {
    this.tasks = [];
  }
  getTask(hash) {
    return this.tasks.find(t => t.term.hash === hash);
  }
  getAllTasks() {
    return this.tasks;
  }
  addTask(task) {
    this.tasks.push(task);
  }
}

describe('Reasoner Component', () => {
  let reasoner;
  let memory;

  beforeEach(() => {
    reasoner = new Reasoner();
    memory = new MockMemory();
  });

  test('should initialize with an empty rule map', () => {
    expect(reasoner.rules.size).toBe(0);
  });

  test('should add a rule', () => {
    const rule = { id: 'test-rule', type: 'general', apply: () => {} };
    reasoner.addRule(rule);
    expect(reasoner.rules.get('test-rule')).toEqual(rule);
  });

  test('reason method should process tasks and return derived tasks', async () => {
    const tasks = [{ term: '((A) --> (B)).', punctuation: '.' }];

    // Mock a simple rule
    const rule = {
      id: 'test-rule',
      type: 'general',
      canApply: () => true,
      apply: jest.fn().mockResolvedValue([{ term: 'derived' }]),
    };
    reasoner.addRule(rule);

    const result = await reasoner.reason(tasks, memory, { currentTime: Date.now() });

    expect(result).toBeDefined();
  });

  test('reason method should return an empty array for empty task list', async () => {
    const result = await reasoner.reason([], memory, { currentTime: Date.now() });
    expect(result).toEqual([]);
  });

  test('reasonWithTrace method should return derived tasks and a trace', async () => {
    const tasks = [{ term: '((A) --> (B)).', punctuation: '.' }];
    const rule = {
      id: 'test-rule',
      type: 'general',
      apply: jest.fn().mockResolvedValue([{ term: 'derived' }]),
    };
    reasoner.addRule(rule);

    const { derivedTasks, trace } = await reasoner.reasonWithTrace(tasks, memory, { currentTime: Date.now() });

    expect(derivedTasks).toBeDefined();
    expect(trace).toBeDefined();
    expect(trace.length).toBeGreaterThan(0);
  });
});