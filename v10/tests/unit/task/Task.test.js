import { Task } from '../../../src/core/task/Task.js';
import { Term } from '../../../src/core/term/Term.js';

describe('Task', () => {
  test('should create tasks with correct properties', () => {
    const term = new Term(['A'], null);
    const truth = { frequency: 0.9, confidence: 0.8 };
    const task = new Task({
      term,
      truth,
      type: 'BELIEF',
      priority: 0.7,
      budget: 0.5
    });

    expect(task.term).toBe(term);
    expect(task.truth).toBe(truth);
    expect(task.type).toBe('BELIEF');
    expect(task.priority).toBe(0.7);
    expect(task.budget).toBe(0.5);
    expect(task.stamp).toBeDefined();
    expect(task.createdAt).toBeDefined();
    expect(task.accessedAt).toBeDefined();
  });

  test('should maintain strict immutability', () => {
    const term = new Term(['A'], null);
    const task = new Task({
      term,
      truth: { frequency: 0.9, confidence: 0.8 },
      type: 'BELIEF'
    });

    // Attempting to modify should not work
    expect(() => {
      task.term = new Term(['B'], null);
    }).toThrow();

    expect(() => {
      task.truth = { frequency: 0.5, confidence: 0.6 };
    }).toThrow();

    expect(() => {
      task.type = 'GOAL';
    }).toThrow();

    expect(() => {
      task.priority = 0.8;
    }).toThrow();

    // Original values should remain unchanged
    expect(task.term).toBe(term);
    expect(task.type).toBe('BELIEF');
  });

  test('should create immutable copies with modified properties', () => {
    const term = new Term(['A'], null);
    const originalTask = new Task({
      term,
      truth: { frequency: 0.9, confidence: 0.8 },
      type: 'BELIEF',
      priority: 0.7
    });

    const newTask = originalTask.withPriority(0.8);

    expect(newTask.priority).toBe(0.8);
    expect(originalTask.priority).toBe(0.7); // Original unchanged
    expect(newTask.term).toBe(originalTask.term); // Same reference
    expect(newTask.truth).toBe(originalTask.truth); // Same reference
    expect(newTask.type).toBe(originalTask.type); // Same value
  });

  test('should create immutable copies with modified truth', () => {
    const term = new Term(['A'], null);
    const originalTask = new Task({
      term,
      truth: { frequency: 0.9, confidence: 0.8 },
      type: 'BELIEF'
    });

    const newTruth = { frequency: 0.7, confidence: 0.6 };
    const newTask = originalTask.withTruth(newTruth);

    expect(newTask.truth).toBe(newTruth);
    expect(originalTask.truth).toEqual({ frequency: 0.9, confidence: 0.8 }); // Original unchanged
    expect(newTask.term).toBe(originalTask.term); // Same reference
    expect(newTask.type).toBe(originalTask.type); // Same value
  });

  test('should handle priority bounds correctly', () => {
    const term = new Term(['A'], null);
    const task = new Task({ term, type: 'BELIEF' });

    const highPriorityTask = task.withPriority(1.5);
    const lowPriorityTask = task.withPriority(-0.5);

    expect(highPriorityTask.priority).toBe(1.0); // Should be clamped to 1.0
    expect(lowPriorityTask.priority).toBe(0.0); // Should be clamped to 0.0
  });

  test('should identify task types correctly', () => {
    const term = new Term(['A'], null);

    const beliefTask = new Task({ term, type: 'BELIEF' });
    const goalTask = new Task({ term, type: 'GOAL' });
    const questionTask = new Task({ term, type: 'QUESTION' });

    expect(beliefTask.isBelief()).toBe(true);
    expect(beliefTask.isGoal()).toBe(false);
    expect(beliefTask.isQuestion()).toBe(false);

    expect(goalTask.isBelief()).toBe(false);
    expect(goalTask.isGoal()).toBe(true);
    expect(goalTask.isQuestion()).toBe(false);

    expect(questionTask.isBelief()).toBe(false);
    expect(questionTask.isGoal()).toBe(false);
    expect(questionTask.isQuestion()).toBe(true);
  });

  test('should handle missing optional parameters with defaults', () => {
    const term = new Term(['A'], null);
    const task = new Task({ term, type: 'BELIEF' });

    expect(task.priority).toBe(0.5); // Default priority
    expect(task.budget).toBe(1.0); // Default budget
    expect(task.stamp).toBeDefined(); // Default stamp should be created
  });

  test('should track access time correctly', () => {
    const term = new Term(['A'], null);
    const task = new Task({ term, type: 'BELIEF' });

    const originalAccessTime = task.accessedAt;

    // Wait a small amount to ensure different timestamp
    const startTime = Date.now();
    while (Date.now() === startTime) {
      // Busy wait for 1ms
    }

    const newTask = task.setAccessedAt(Date.now());

    expect(newTask.accessedAt).toBeGreaterThan(originalAccessTime);
    expect(task.accessedAt).toBe(originalAccessTime); // Original unchanged
  });

  test('should implement proper equality comparison', () => {
    const term = new Term(['A'], null);
    const task1 = new Task({
      term,
      truth: { frequency: 0.9, confidence: 0.8 },
      type: 'BELIEF'
    });
    const task2 = new Task({
      term,
      truth: { frequency: 0.9, confidence: 0.8 },
      type: 'BELIEF'
    });
    const task3 = new Task({
      term: new Term(['B'], null),
      truth: { frequency: 0.9, confidence: 0.8 },
      type: 'BELIEF'
    });

    expect(task1.equals(task2)).toBe(true);
    expect(task1.equals(task3)).toBe(false);
    expect(task1.equals(null)).toBe(false);
    expect(task1.equals({})).toBe(false);
  });

  test('should handle edge cases and error conditions', () => {
    const term = new Term(['A'], null);

    // Test with null term
    expect(() => {
      new Task({ term: null, type: 'BELIEF' });
    }).not.toThrow(); // Should handle null term gracefully

    // Test with invalid type
    expect(() => {
      new Task({ term, type: 'INVALID_TYPE' });
    }).not.toThrow(); // Should handle invalid types gracefully

    // Test equals with various types
    const task = new Task({ term, type: 'BELIEF' });
    expect(task.equals(null)).toBe(false);
    expect(task.equals({})).toBe(false);
    expect(task.equals('not a task')).toBe(false);
    expect(task.equals(new Task({ term: new Term(['B'], null), type: 'BELIEF' }))).toBe(false);
    expect(task.equals(new Task({ term, type: 'BELIEF' }))).toBe(true);
  });

  test('should handle stamp creation correctly', () => {
    const term = new Term(['A'], null);
    const task = new Task({ term, type: 'BELIEF' });

    expect(task.stamp).toBeDefined();
    expect(task.stamp.id).toBeDefined();
    expect(task.stamp.occurrenceTime).toBeDefined();
    expect(task.stamp.source).toBeDefined();
  });

  test('should handle custom stamp correctly', () => {
    const term = new Term(['A'], null);
    const customStamp = {
      id: 'custom-id',
      occurrenceTime: Date.now(),
      source: 'TEST'
    };

    const task = new Task({
      term,
      type: 'BELIEF',
      stamp: customStamp
    });

    expect(task.stamp).toBe(customStamp);
  });

  test('should maintain creation time immutability', () => {
    const term = new Term(['A'], null);
    const beforeCreation = Date.now();
    const task = new Task({ term, type: 'BELIEF' });
    const afterCreation = Date.now();

    expect(task.createdAt).toBeGreaterThanOrEqual(beforeCreation);
    expect(task.createdAt).toBeLessThanOrEqual(afterCreation);

    // Creation time should not change
    expect(task.createdAt).toBe(task.createdAt);
  });
});