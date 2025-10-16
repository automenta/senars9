import { NAR } from '../../core/NAR.js';
import { Punctuation, TruthValue } from '../../core/Task.js';
import { Term } from '../../core/Term.js';

describe('NAR', () => {
  let nar;

  beforeEach(async () => {
    nar = new NAR();
    await nar.initialize();
  });

  it('should create instance', () => {
    expect(nar).toBeDefined();
  });

  it('should input a belief task', () => {
    const task = nar.believe('A.');
    expect(task).toBeDefined();
    expect(task.punctuation).toBe(Punctuation.BELIEF);
    expect(task.term.name).toBe('A.');
    const beliefs = nar.getBeliefs();
    expect(beliefs.length).toBe(1);
    expect(beliefs[0].term.name).toBe('A.');
  });

  it('should input a goal task', () => {
    const task = nar.want('B!');
    expect(task).toBeDefined();
    expect(task.punctuation).toBe(Punctuation.GOAL);
    expect(task.term.name).toBe('B!');
    const goals = nar.getGoals();
    expect(goals.length).toBe(1);
    expect(goals[0].term.name).toBe('B!');
  });

  it('should input a question task', () => {
    const task = nar.ask('C?');
    expect(task).toBeDefined();
    expect(task.punctuation).toBe(Punctuation.QUESTION);
    expect(task.term.name).toBe('C?');
    const questions = nar.getQuestions();
    expect(questions.length).toBe(1);
    expect(questions[0].term.name).toBe('C?');
  });

  it('should run a reasoning cycle', async () => {
    nar.believe('A.');
    const initialStats = nar.getStats();
    expect(initialStats.cycles).toBe(0);

    await nar.runCycle();

    const newStats = nar.getStats();
    expect(newStats.cycles).toBe(1);
  });

  it('should get tasks by priority', () => {
    nar.believe('A.', new TruthValue(0.9, 0.9));
    nar.believe('B.', new TruthValue(0.5, 0.5));
    const tasks = nar.getTasksByPriority();
    expect(tasks.length).toBe(2);
  });

  it('should get statistics', () => {
    nar.believe('A.');
    const stats = nar.getStats();
    const memoryState = nar.getMemoryState();
    expect(stats.taskCount).toBe(1);
    expect(memoryState.beliefs).toBe(1);
    expect(memoryState.goals).toBe(0);
    expect(memoryState.questions).toBe(0);
  });

  it('should enable and disable a rule', () => {
    const ruleId = 'test-rule';
    nar.reasoner.addRule({ id: ruleId, type: 'general', apply: () => {} });

    nar.disableRule(ruleId);
    let enabledRules = nar.reasoner.getEnabledRules();
    expect(enabledRules.find(r => r.id === ruleId)).toBeUndefined();

    nar.enableRule(ruleId);
    enabledRules = nar.reasoner.getEnabledRules();
    expect(enabledRules.find(r => r.id === ruleId)).toBeDefined();
  });

  it('should enable and disable a rule type', () => {
    const rule = { id: 'test-rule', type: 'general', apply: () => {} };
    nar.reasoner.addRule(rule);

    nar.disableRuleType('general');
    let enabledRules = nar.reasoner.getEnabledRules();
    expect(enabledRules.find(r => r.id === 'test-rule')).toBeUndefined();

    nar.enableRuleType('general');
    enabledRules = nar.reasoner.getEnabledRules();
    expect(enabledRules.find(r => r.id === 'test-rule')).toBeDefined();
  });
});