import { jest } from '@jest/globals';
import Rules from '../../core/Rules.js';

// Mock Task and Rule structures for testing
const createMockTask = (type) => ({
  term: { type },
});

const createMockRule = (id, priority, complexity, premises, categories = []) => ({
  id,
  priority,
  complexity,
  premises, // e.g., [{ type: 'inheritance' }]
  categories,
  apply: jest.fn(tasks => tasks.map(t => ({ ...t, derived: true, ruleId: id }))),
});

describe('Rules', () => {
  let rulesEngine;

  beforeEach(async () => {
    rulesEngine = new Rules();
    await rulesEngine.initialize({});
  });

  test('should initialize with empty rules and index', () => {
    expect(rulesEngine.rules.size).toBe(0);
    expect(rulesEngine.ruleIndex.size).toBe(0);
  });

  describe('Rule Management', () => {
    test('should add a rule successfully', () => {
      const rule = createMockRule('rule1', 0.5, 10, [{ type: 'inheritance' }]);
      rulesEngine.addRule(rule);
      expect(rulesEngine.rules.has('rule1')).toBe(true);
      expect(rulesEngine.getRule('rule1')).toBe(rule);
    });

    test('should throw an error if rule has no ID', () => {
      const rule = { name: 'invalid' };
      expect(() => rulesEngine.addRule(rule)).toThrow('Rule must have an ID.');
    });

    test('should warn when overwriting an existing rule', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const rule1 = createMockRule('rule1', 0.5, 10, []);
      const rule2 = createMockRule('rule1', 0.6, 12, []);
      rulesEngine.addRule(rule1);
      rulesEngine.addRule(rule2);
      expect(warnSpy).toHaveBeenCalledWith('Rule with ID "rule1" already exists. Overwriting.');
      expect(rulesEngine.getRule('rule1')).toBe(rule2);
      warnSpy.mockRestore();
    });

    test('should remove a rule and de-index it', () => {
      const rule = createMockRule('rule1', 0.5, 10, [], ['cat1']);
      rulesEngine.addRule(rule);
      expect(rulesEngine.ruleIndex.get('cat1').has('rule1')).toBe(true);

      rulesEngine.removeRule('rule1');
      expect(rulesEngine.rules.has('rule1')).toBe(false);
      expect(rulesEngine.ruleIndex.get('cat1').size).toBe(0);
    });
  });

  describe('Rule Applicability and Execution', () => {
    let rule1, rule2, rule3;

    beforeEach(() => {
      rule1 = createMockRule('rule1', 0.8, 10, [{ type: 'typeA' }]);
      rule2 = createMockRule('rule2', 0.5, 15, [{ type: 'typeB' }]);
      rule3 = createMockRule('rule3', 0.8, 5, [{ type: 'typeA' }]); // Same priority as rule1, lower complexity

      rulesEngine.addRule(rule1);
      rulesEngine.addRule(rule2);
      rulesEngine.addRule(rule3);
    });

    test('findApplicableRules should find rules matching task type', () => {
      const task = createMockTask('typeA');
      const applicable = rulesEngine.findApplicableRules(task);
      expect(applicable.map(r => r.id)).toEqual(['rule3', 'rule1']); // Prioritized
    });

    test('findApplicableRules should return an empty array if no rules match', () => {
      const task = createMockTask('typeC');
      const applicable = rulesEngine.findApplicableRules(task);
      expect(applicable).toEqual([]);
    });

    test('_prioritizeRules should sort by priority (desc) then complexity (asc)', () => {
      const rules = [rule1, rule2, rule3];
      const prioritized = rulesEngine._prioritizeRules(rules);
      expect(prioritized.map(r => r.id)).toEqual(['rule3', 'rule1', 'rule2']);
    });

    test('executeRules should apply all applicable rules to a task', () => {
      const taskA = createMockTask('typeA');
      const taskB = createMockTask('typeB');
      const derived = rulesEngine.executeRules([taskA, taskB]);

      expect(rule1.apply).toHaveBeenCalled();
      expect(rule2.apply).toHaveBeenCalled();
      expect(rule3.apply).toHaveBeenCalled();

      expect(derived.length).toBe(3);
      expect(derived.map(d => d.ruleId).sort()).toEqual(['rule1', 'rule2', 'rule3']);
    });
  });

  describe('Indexing', () => {
    test('_indexRule should add rule to index by category', () => {
      const rule = createMockRule('indexedRule', 0.5, 10, [], ['catA', 'catB']);
      rulesEngine.addRule(rule);
      expect(rulesEngine.ruleIndex.get('catA').has('indexedRule')).toBe(true);
      expect(rulesEngine.ruleIndex.get('catB').has('indexedRule')).toBe(true);
    });

    test('_deindexRule should remove rule from index', () => {
      const rule = createMockRule('indexedRule', 0.5, 10, [], ['catA']);
      rulesEngine.addRule(rule);
      rulesEngine.removeRule('indexedRule');
      expect(rulesEngine.ruleIndex.get('catA').size).toBe(0);
    });
  });
});