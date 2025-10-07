import Memory from '../../core/Memory.js';

describe('Memory Component', () => {
  let memory;
  const mockTask1 = { id: 'task1', type: 'belief', term: 'term1' };
  const mockTask2 = { id: 'task2', type: 'goal', term: 'term2' };
  const mockTask3 = { id: 'task3', type: 'belief', term: 'term3' };

  beforeEach(async () => {
    memory = new Memory();
    await memory.initialize();
    await memory.storeTask(mockTask1);
    await memory.storeTask(mockTask2);
    await memory.storeTask(mockTask3);
  });

  test('should store and retrieve a task', async () => {
    const retrieved = await memory.retrieveTask('task1');
    expect(retrieved).toEqual(mockTask1);
  });

  test('should return undefined for a non-existent task', async () => {
    const retrieved = await memory.retrieveTask('non-existent');
    expect(retrieved).toBeUndefined();
  });

  test('should update an existing task', async () => {
    await memory.updateTask('task2', { priority: 0.9 });
    const updated = await memory.retrieveTask('task2');
    expect(updated).toEqual({ ...mockTask2, priority: 0.9 });
  });

  test('should throw an error when updating a non-existent task', async () => {
    await expect(memory.updateTask('non-existent', {})).rejects.toThrow(
      'Task with ID "non-existent" not found.'
    );
  });

  test('should delete a task', async () => {
    await memory.deleteTask('task3');
    const deleted = await memory.retrieveTask('task3');
    expect(deleted).toBeUndefined();
  });

  test('should query tasks based on criteria', async () => {
    const results = await memory.queryTasks({ type: 'belief' });
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(mockTask1);
    expect(results).toContainEqual(mockTask3);
  });

  test('should use query cache for repeated queries', async () => {
    const query = { type: 'goal' };
    const queryKey = JSON.stringify(query);

    // First query populates the cache
    const results1 = await memory.queryTasks(query);
    expect(results1).toHaveLength(1);
    expect(memory.queryCache.has(queryKey)).toBe(true);

    // Manually overwrite the cache to prove it's being used
    const manualCacheEntry = [{ id: 'cached-task' }];
    memory.queryCache.set(queryKey, manualCacheEntry);

    // Second query should return the manually set cache entry
    const results2 = await memory.queryTasks(query);
    expect(results2).toBe(manualCacheEntry);
  });

  test('should invalidate query cache after storing a task', async () => {
    const query = { type: 'belief' };
    await memory.queryTasks(query); // Populate cache
    expect(memory.queryCache.size).toBe(1);

    await memory.storeTask({ id: 'task4', type: 'belief' });
    expect(memory.queryCache.size).toBe(0);
  });

  test('should return correct metrics', () => {
    const metrics = memory.getMetrics();
    expect(metrics.totalTasks).toBe(3);
  });
});