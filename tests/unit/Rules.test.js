/**
 * @file: tests/unit/Rules.test.js
 * @description: Unit tests for the Rules component.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
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
      let actionFired = false;
      const action = () => { actionFired = true; };
      rules.add({ name: 'test-rule', condition: () => true, action });
      await rules.evaluate({});
      expect(actionFired).toBe(true);
    });

    test('should not execute the action of a non-matching rule', async () => {
      let actionFired = false;
      const action = () => { actionFired = true; };
      rules.add({ name: 'test-rule', condition: () => false, action });
      await rules.evaluate({});
      expect(actionFired).toBe(false);
    });

    test('should execute the highest priority rule', async () => {
      let highPriorityFired = false;
      let lowPriorityFired = false;
      const lowPriorityAction = () => { lowPriorityFired = true; };
      const highPriorityAction = () => { highPriorityFired = true; };
      rules.add({ name: 'low-priority', condition: () => true, action: lowPriorityAction, priority: 1 });
      rules.add({ name: 'high-priority', condition: () => true, action: highPriorityAction, priority: 10 });
      await rules.evaluate({});
      expect(highPriorityFired).toBe(true);
      expect(lowPriorityFired).toBe(false);
    });

    test('should pass the context to the condition and action', async () => {
      const context = { value: 42 };
      let conditionContext = null;
      let actionContext = null;
      const condition = (ctx) => {
        conditionContext = ctx;
        return ctx.value === 42;
      };
      const action = (ctx) => { actionContext = ctx; };
      rules.add({ name: 'context-rule', condition, action });
      await rules.evaluate(context);
      expect(conditionContext).toBe(context);
      expect(actionContext).toBe(context);
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