/**
 * @file: tests/unit/Memory.test.js
 * @description: Unit tests for the Memory component.
 */

import Memory from '../../core/Memory.js';

describe('Memory Component', () => {
  let memory;

  beforeEach(() => {
    memory = new Memory();
    memory.initialize({ cacheSize: 3 });
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

  describe('Caching Logic', () => {
    test('should cache a value on get', () => {
      memory.storage.set('key', 'value'); // Directly set in storage
      expect(memory.cache.has('key')).toBe(false);
      memory.get('key');
      expect(memory.cache.has('key')).toBe(true);
      expect(memory.cache.get('key')).toBe('value');
    });

    test('should cache a value on set', () => {
      memory.set('key', 'value');
      expect(memory.cache.has('key')).toBe(true);
      expect(memory.cache.get('key')).toBe('value');
    });

    test('should retrieve a value from cache without hitting storage', () => {
      memory.set('key', 'value');
      memory.storage.delete('key'); // Remove from main storage
      expect(memory.get('key')).toBe('value'); // Should still be in cache
    });

    test('should remove a value from cache on delete', () => {
      memory.set('key', 'value');
      memory.delete('key');
      expect(memory.cache.has('key')).toBe(false);
    });

    test('should clear the cache when clear is called', () => {
      memory.set('key', 'value');
      memory.clear();
      expect(memory.cache.has('key')).toBe(false);
    });

    test('should evict the oldest item when cache size is exceeded', () => {
      memory.set('a', 1); // oldest
      memory.set('b', 2);
      memory.set('c', 3);
      expect(memory.cache.size).toBe(3);

      memory.set('d', 4); // should evict 'a'
      expect(memory.cache.size).toBe(3);
      expect(memory.cache.has('a')).toBe(false);
      expect(memory.cache.has('d')).toBe(true);
    });

    test('should mark an item as recently used when accessed', () => {
      memory.set('a', 1); // oldest
      memory.set('b', 2);
      memory.set('c', 3);

      memory.get('a'); // 'a' is now the most recently used

      memory.set('d', 4); // should evict 'b'
      expect(memory.cache.has('b')).toBe(false);
      expect(memory.cache.has('a')).toBe(true);
    });
  });
});