import { jest } from '@jest/globals';
import Rules from '../../core/Rules.js';

describe('Rules Component', () => {
  let rules;
  const mockRule1 = {
    id: 'rule1',
    priority: 0.8,
    complexity: 10,
    premises: [{ type: 'A' }],
    apply: jest.fn(tasks => [{ derived: true, from: tasks[0], rule: 'rule1' }]),
  };
  const mockRule2 = {
    id: 'rule2',
    priority: 0.5,
    complexity: 20,
    premises: [{ type: 'B' }],
    apply: jest.fn(),
  };
  const mockRule3 = {
    id: 'rule3',
    priority: 0.8,
    complexity: 5, // Higher priority, lower complexity than rule1
    premises: [{ type: 'A' }],
    apply: jest.fn(tasks => [{ derived: true, from: tasks[0], rule: 'rule3' }]),
  };

  beforeEach(async () => {
    rules = new Rules();
    await rules.initialize();
    rules.addRule(mockRule1);
    rules.addRule(mockRule2);
    rules.addRule(mockRule3);

    // Clear mocks before each test to ensure isolation
    mockRule1.apply.mockClear();
    mockRule2.apply.mockClear();
    mockRule3.apply.mockClear();
  });

  test('should add and retrieve a rule', () => {
    const rule = rules.getRule('rule1');
    expect(rule).toBe(mockRule1);
  });

  test('should remove a rule', () => {
    rules.removeRule('rule2');
    expect(rules.getRule('rule2')).toBeUndefined();
  });

  test('should find applicable rules based on task type', () => {
    const task = { term: { type: 'A' } };
    const applicableRules = rules.findApplicableRules(task);
    expect(applicableRules.map(r => r.id)).toEqual(['rule3', 'rule1']);
  });

  test('should prioritize rules correctly (priority DESC, complexity ASC)', () => {
    const task = { term: { type: 'A' } };
    const applicableRules = rules.findApplicableRules(task);
    expect(applicableRules[0].id).toBe('rule3');
    expect(applicableRules[1].id).toBe('rule1');
  });

  test('should execute applicable rules for a task', () => {
    const task = { term: { type: 'A' } };
    const derivedTasks = rules.executeRules([task]);
    expect(mockRule1.apply).toHaveBeenCalled();
    expect(mockRule3.apply).toHaveBeenCalled();
    expect(derivedTasks).toHaveLength(2); // Both rules should apply
    expect(derivedTasks).toContainEqual({ derived: true, from: task, rule: 'rule1' });
    expect(derivedTasks).toContainEqual({ derived: true, from: task, rule: 'rule3' });
  });

  test('should not execute rules for a non-matching task', () => {
    const task = { term: { type: 'C' } };
    rules.executeRules([task]);
    expect(mockRule1.apply).not.toHaveBeenCalled();
    expect(mockRule2.apply).not.toHaveBeenCalled();
    expect(mockRule3.apply).not.toHaveBeenCalled();
  });
});