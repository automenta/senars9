/**
 * @file: tests/unit/Reasoning.test.js
 * @description: Unit tests for the Reasoning component.
 */

import { jest } from '@jest/globals';
import Reasoning from '../../core/Reasoning.js';

describe('Reasoning Component', () => {
  let reasoning;
  let mockCore;

  beforeEach(() => {
    reasoning = new Reasoning();
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

  test('reason method should call the rules engine', async () => {
    const tasks = [{ id: 'task1' }];
    const derivedTasks = [{ id: 'derived1' }];
    mockCore.rules.executeRules.mockReturnValue(derivedTasks);

    const result = await reasoning.reason(tasks);

    expect(mockCore.rules.executeRules).toHaveBeenCalledWith(tasks, expect.any(Object));
    expect(result).toEqual(derivedTasks);
  });

  test('reason method should return an empty array if rules component is not available', async () => {
    reasoning.core = {}; // No rules component
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await reasoning.reason([]);

    expect(result).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Rules component not available. Reasoning will be skipped.');

    consoleWarnSpy.mockRestore();
  });
});