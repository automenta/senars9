/**
 * @file: tests/unit/Memory.test.js
 * @description: Unit tests for the Memory component.
 */

import { jest } from '@jest/globals';
import Memory from '../../core/Memory.js';

describe('Memory Component', () => {
  let memory;

  beforeEach(() => {
    memory = new Memory();
    memory.initialize();
  });

  test('should initialize with empty storages and indexes', () => {
    expect(memory.shortTermTasks.size).toBe(0);
    expect(memory.longTermTasks.size).toBe(0);
    expect(memory.implicationIndex.size).toBe(0);
  });

  test('should store and retrieve a task', async () => {
    const task = { term: { hash: 'task1' }, data: 'test data' };
    await memory.storeTask(task);
    const retrieved = await memory.retrieveTask('task1');
    expect(retrieved).toEqual(task);
  });

  test('should throw an error if task has no hash', async () => {
    const task = { term: {}, data: 'test data' };
    await expect(memory.storeTask(task)).rejects.toThrow('Task must have a valid term with a hash.');
  });

  test('should update a task', async () => {
    const task = { term: { hash: 'task1' }, data: 'initial data' };
    await memory.storeTask(task);
    await memory.updateTask('task1', { data: 'updated data' });
    const retrieved = await memory.retrieveTask('task1');
    expect(retrieved.data).toBe('updated data');
  });

  test('should delete a task', async () => {
    const task = { term: { hash: 'task1' }, data: 'test data' };
    await memory.storeTask(task);
    await memory.deleteTask('task1');
    const retrieved = await memory.retrieveTask('task1');
    expect(retrieved).toBeUndefined();
  });

  test('should query tasks based on properties', async () => {
    const task1 = { term: { hash: 'task1', type: 'A' }, punctuation: '.' };
    const task2 = { term: { hash: 'task2', type: 'B' }, punctuation: '!' };
    const task3 = { term: { hash: 'task3', type: 'A' }, punctuation: '?' };

    await memory.storeTask(task1);
    await memory.storeTask(task2);
    await memory.storeTask(task3);

    const results = await memory.queryTasks({ type: 'A' });
    expect(results.length).toBe(2);
    expect(results).toContain(task1);
    expect(results).toContain(task3);
  });
});