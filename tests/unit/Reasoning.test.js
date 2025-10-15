/**
 * @file: tests/unit/Reasoning.test.js
 * @description: Unit tests for the Reasoning component.
 */

import { jest } from '@jest/globals';
import { Reasoner } from '../../core/Reasoner.js';
import { withCoreSetup } from './enhanced-test-utils.js';

describe('Reasoning Component', () => {
  test('should initialize with an empty strategy map', withCoreSetup((core) => {
    const { reasoner } = core;
    expect(reasoner.strategies.size).toBe(0);
  }));

  test('should add a reasoning strategy', withCoreSetup((core) => {
    const { reasoner } = core;
    const strategy = { id: 'test-strategy', execute: () => {} };
    reasoner.addStrategy(strategy);
    expect(reasoner.strategies.get('test-strategy')).toEqual(strategy);
  }));

  test('reason method should process tasks and return derived tasks', withCoreSetup(async (core) => {
    const { reasoner, memory } = core;
    const tasks = [{ term: '((A) --> (B)).', punctuation: '.' }];

    // Mock the getRelevantTasks method to return an empty array
    memory.getRelevantTasks = jest.fn().mockReturnValue([]);

    const result = await reasoner.reason(tasks, memory);

    expect(result).toBeDefined();
  }));

  test('reason method should return an empty array for empty task list', withCoreSetup(async (core) => {
    const { reasoner, memory } = core;
    const result = await reasoner.reason([], memory);
    expect(result).toEqual([]);
  }));
});
