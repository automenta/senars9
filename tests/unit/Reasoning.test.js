import { jest } from '@jest/globals';
import Reasoning from '../../core/Reasoning.js';
import Component from '../../core/Component.js';

describe('Reasoning Component', () => {
  let reasoning;
  let mockCore;
  let mockRules;

  beforeEach(async () => {
    mockRules = {
      executeRules: jest.fn(tasks => [{ derived: true, from: tasks[0] }]),
    };
    mockCore = {
      rules: mockRules,
    };

    reasoning = new Reasoning();
    await reasoning.initialize({});
    reasoning.core = mockCore; // Manually attach mock core
  });

  test('should initialize with a default reasoning strategy', () => {
    expect(reasoning.strategies.has('default')).toBe(true);
    const metrics = reasoning.getMetrics();
    expect(metrics.strategyCount).toBe(1);
  });

  test('should add and remove a reasoning strategy', () => {
    const newStrategy = { id: 'custom', name: 'Custom Strategy', execute: () => {} };
    reasoning.addStrategy(newStrategy);
    expect(reasoning.strategies.has('custom')).toBe(true);
    expect(reasoning.getMetrics().strategyCount).toBe(2);

    reasoning.removeStrategy('custom');
    expect(reasoning.strategies.has('custom')).toBe(false);
    expect(reasoning.getMetrics().strategyCount).toBe(1);
  });

  test('reason() should use the default strategy and call the rules engine', async () => {
    const tasks = [{ id: 'task1' }];
    const derivedTasks = await reasoning.reason(tasks);

    expect(mockRules.executeRules).toHaveBeenCalledWith(tasks, {});
    expect(derivedTasks).toEqual([{ derived: true, from: tasks[0] }]);
  });

  test('reason() should use a custom strategy when specified', async () => {
    const customStrategy = {
      id: 'custom',
      execute: jest.fn(() => [{ derived: true, custom: true }]),
    };
    reasoning.addStrategy(customStrategy);

    const tasks = [{ id: 'task1' }];
    const derivedTasks = await reasoning.reason(tasks, {}, 'custom');

    expect(customStrategy.execute).toHaveBeenCalledWith(tasks, {});
    expect(derivedTasks).toEqual([{ derived: true, custom: true }]);
    expect(mockRules.executeRules).not.toHaveBeenCalled();
  });

  test('reason() should throw an error for a non-existent strategy', async () => {
    await expect(reasoning.reason([], {}, 'non-existent')).rejects.toThrow(
      'Reasoning strategy "non-existent" not found.'
    );
  });

  test('default strategy should throw error if core.rules is not available', async () => {
    const plainReasoning = new Reasoning();
    await plainReasoning.initialize({}); // No core attached

    await expect(plainReasoning.reason([{}])).rejects.toThrow(
      'Rules component not available on core.'
    );
  });
});