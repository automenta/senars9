import Memory from '../../core/Memory.js';

describe('Memory Component', () => {
  let memory;

  beforeEach(async () => {
    memory = new Memory();
    await memory.initialize({ cacheSize: 3 });
  });

  test('should set and get a value', () => {
    memory.set('key', 'value');
    expect(memory.get('key')).toBe('value');
  });

  test('should return undefined for a non-existent key', () => {
    expect(memory.get('non-existent')).toBeUndefined();
  });

  test('should delete a value', () => {
    memory.set('key', 'value');
    memory.delete('key');
    expect(memory.get('key')).toBeUndefined();
  });

  test('should check if a key exists', () => {
    memory.set('key', 'value');
    expect(memory.has('key')).toBe(true);
    expect(memory.has('non-existent')).toBe(false);
  });

  test('should clear all values', () => {
    memory.set('key1', 'value1');
    memory.set('key2', 'value2');
    memory.clear();
    expect(memory.has('key1')).toBe(false);
    expect(memory.has('key2')).toBe(false);
  });

  describe('Performance', () => {
    test('should provide fast access to recently used items', () => {
      memory.set('key', 'value');
      const startTime = Date.now();
      memory.get('key');
      const accessTime = Date.now() - startTime;
      expect(accessTime).toBeLessThan(5); // Should be very fast
    });

    test('should maintain performance under load', () => {
      for (let i = 0; i < 100; i++) {
        memory.set(`key${i}`, `value${i}`);
      }

      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        memory.get(`key${i}`);
      }
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(100); // Should handle load efficiently
    });

    test('should provide memory usage statistics', () => {
      memory.set('key1', 'value1');
      memory.set('key2', 'value2');

      const stats = memory.getStats();
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.focusSets).toBeDefined();
    });
  });
});