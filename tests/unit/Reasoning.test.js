/**
 * @file: tests/unit/Reasoning.test.js
 * @description: Unit tests for the Reasoning component.
 */

import { jest } from '@jest/globals';
import Reasoning from '../../core/reasoning/Reasoning.js';

describe('Reasoning Component', () => {
  let reasoning;
  let mockCore;

  beforeEach(() => {
    reasoning = new Reasoner();
    mockCore = {
      rules: {
        executeRules: jest.fn().mockReturnValue([]),
      },
    };
    reasoning.core = mockCore;
    reasoning.initialize();
  });

  test('should initialize with an empty strategy map', () => {
    expect(reasoning.strategies.size).toBe(0);
  });

  test('should add a reasoning strategy', () => {
    const strategy = { id: 'test-strategy', execute: () => {} };
    reasoning.addStrategy(strategy);
    expect(reasoning.strategies.get('test-strategy')).toEqual(strategy);
  });

  test('reason method should process tasks and return derived tasks', async () => {
    const tasks = [{ term: '((A) --> (B)).', punctuation: '.' }];
    const derivedTasks = [{ term: '(B).', punctuation: '.', truth: { frequency: 0.9, confidence: 0.8 }, priority: 0.5, timestamp: expect.any(Number), derivationPath: ['reasoning:deduction'] }];

    const result = await reasoning.reason(tasks);

    expect(result).toHaveLength(1);
    expect(result[0].term).toBe('(B).');
    expect(result[0].derivationPath).toContain('reasoning:deduction');
  });

  test('reason method should return an empty array for empty task list', async () => {
    const result = await reasoning.reason([]);
    expect(result).toEqual([]);
  });
});