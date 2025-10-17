import { Task, TruthValue } from '../../../src/core/task/Task.js';
import { Stamp } from '../../../src/core/task/Stamp.js';
import { Term } from '../../../src/core/term/Term.js';

describe('Task', () => {
  let term;

  beforeEach(() => {
    term = Term.newAtom('A');
  });

  test('should create tasks with correct properties', () => {
    const truth = new TruthValue(0.9, 0.8);
    const task = new Task({ term, type: 'BELIEF', truth });

    expect(task.term).toBe(term);
    expect(task.type).toBe('BELIEF');
    expect(task.truth).toBe(truth);
    expect(task.priority).toBe(0.5); // default
    expect(task.budget).toBe(1.0); // default
    expect(task.stamp).toBeInstanceOf(Stamp);
    expect(task.createdAt).toBeDefined();
    expect(task.accessedAt).toBe(task.createdAt);
  });

  test('should throw an error if not initialized with a Term', () => {
    expect(() => new Task({ term: 'not-a-term', type: 'BELIEF' })).toThrow('Task must be initialized with a valid Term object.');
  });

  test('should maintain strict immutability', () => {
    const task = new Task({ term, type: 'BELIEF' });
    expect(() => {
      task.type = 'GOAL';
    }).toThrow();
  });

  test('should create immutable copies with modified properties', () => {
    const task1 = new Task({ term, type: 'BELIEF', priority: 0.5 });

    const task2 = task1.withPriority(0.8);
    expect(task1.priority).toBe(0.5);
    expect(task2.priority).toBe(0.8);
    expect(task2.term).toBe(task1.term);

    const truth = new TruthValue(0.9, 0.9);
    const task3 = task2.withTruth(truth);
    expect(task2.truth).toBeNull();
    expect(task3.truth).toBe(truth);

    const time = Date.now() + 1000;
    const task4 = task3.withAccessedAt(time);
    expect(task3.accessedAt).not.toBe(time);
    expect(task4.accessedAt).toBe(time);
  });

  test('should identify task types correctly', () => {
    const belief = new Task({ term, type: 'BELIEF' });
    const goal = new Task({ term, type: 'GOAL' });
    const question = new Task({ term, type: 'QUESTION' });

    expect(belief.isBelief()).toBe(true);
    expect(belief.isGoal()).toBe(false);
    expect(goal.isGoal()).toBe(true);
    expect(question.isQuestion()).toBe(true);
  });

  test('should implement proper equality comparison', () => {
    const truth1 = new TruthValue(0.9, 0.9);
    const truth2 = new TruthValue(0.9, 0.9);
    const truth3 = new TruthValue(0.8, 0.8);

    const task1 = new Task({ term, type: 'BELIEF', truth: truth1 });
    const task2 = new Task({ term, type: 'BELIEF', truth: truth2 }); // Same content
    const task3 = new Task({ term, type: 'BELIEF', truth: truth3 }); // Different truth
    const task4 = new Task({ term: Term.newAtom('B'), type: 'BELIEF', truth: truth1 }); // Different term
    const task5 = new Task({ term, type: 'GOAL', truth: truth1 }); // Different type

    expect(task1.equals(task2)).toBe(true);
    expect(task1.equals(task3)).toBe(false);
    expect(task1.equals(task4)).toBe(false);
    expect(task1.equals(task5)).toBe(false);
    expect(task1.equals(null)).toBe(false);
  });
});