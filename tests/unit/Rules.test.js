/**
 * @file: tests/unit/Rules.test.js
 * @description: Unit tests for the Rules component.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import Rules from '../../core/Rules.js';

describe('Rules Component', () => {
  let rules;

  beforeEach(() => {
    rules = new Rules();
    rules.initialize();
  });

  test('should add and retrieve a rule', () => {
    const rule = { name: 'test-rule', condition: () => true, action: () => 'fired' };
    rules.add(rule);
    const found = rules.find(r => r.name === 'test-rule');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('test-rule');
  });

  test('should remove a rule by name', () => {
    const rule = { name: 'test-rule', condition: () => true, action: () => {} };
    rules.add(rule);
    rules.remove('test-rule');
    const found = rules.find(r => r.name === 'test-rule');
    expect(found).toHaveLength(0);
  });

  test('should throw an error if a rule is missing required properties', () => {
    expect(() => rules.add({})).toThrow('Rule must have a name, condition, and action.');
    expect(() => rules.add({ name: 'test' })).toThrow('Rule must have a name, condition, and action.');
    expect(() => rules.add({ name: 'test', condition: () => true })).toThrow('Rule must have a name, condition, and action.');
  });

  describe('evaluate', () => {
    test('should execute the action of a matching rule', async () => {
      const action = jest.fn();
      rules.add({ name: 'test-rule', condition: () => true, action });
      await rules.evaluate({});
      expect(action).toHaveBeenCalledTimes(1);
    });

    test('should not execute the action of a non-matching rule', async () => {
      const action = jest.fn();
      rules.add({ name: 'test-rule', condition: () => false, action });
      await rules.evaluate({});
      expect(action).not.toHaveBeenCalled();
    });

    test('should execute the highest priority rule', async () => {
      const lowPriorityAction = jest.fn();
      const highPriorityAction = jest.fn();
      rules.add({ name: 'low-priority', condition: () => true, action: lowPriorityAction, priority: 1 });
      rules.add({ name: 'high-priority', condition: () => true, action: highPriorityAction, priority: 10 });
      await rules.evaluate({});
      expect(highPriorityAction).toHaveBeenCalledTimes(1);
      expect(lowPriorityAction).not.toHaveBeenCalled();
    });

    test('should pass the context to the condition and action', async () => {
      const context = { value: 42 };
      const condition = jest.fn(ctx => ctx.value === 42);
      const action = jest.fn();
      rules.add({ name: 'context-rule', condition, action });
      await rules.evaluate(context);
      expect(condition).toHaveBeenCalledWith(context);
      expect(action).toHaveBeenCalledWith(context);
    });

    test('should return the result of the action', async () => {
      rules.add({ name: 'return-rule', condition: () => true, action: () => 'result' });
      const result = await rules.evaluate({});
      expect(result).toBe('result');
    });

    test('should return null if no rules match', async () => {
      const result = await rules.evaluate({});
      expect(result).toBeNull();
    });
  });
});