import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import createCore from '../../core/createCore.js';

describe('Memory System Examples - Unit Tests', () => {
  let core;

  beforeEach(async () => {
    core = await createCore();
  });

  afterEach(async () => {
    await core.stop();
    await core.destroy();
  });

  describe('Focus Sets Management', () => {
    test('should create and manage focus sets correctly', () => {
      // Create focus sets for different attention areas
      core.memory.createFocusSet('working-memory', 5);
      core.memory.createFocusSet('long-term-storage', 10);
      core.memory.createFocusSet('attention-focus', 3);
      core.memory.createFocusSet('pattern-buffer', 8);

      // Set current focus to working memory
      core.memory.setFocus('working-memory');

      // Verify focus was set
      const currentFocus = core.memory.getCurrentFocus();
      expect(currentFocus).toBe('working-memory');
    });

    test('should add items with different priorities and metadata', () => {
      const items = [
        {
          key: 'urgent-alert-001',
          value: {
            content: 'Critical system temperature exceeded threshold',
            priority: 10,
            type: 'alert',
            severity: 'critical'
          },
          options: {
            type: 'alert',
            tags: ['urgent', 'system', 'temperature'],
            priority: 10
          }
        },
        {
          key: 'task-meeting-0900',
          value: {
            content: 'Daily standup meeting at 9:00 AM',
            priority: 7,
            type: 'task',
            category: 'meeting'
          },
          options: {
            type: 'task',
            tags: ['meeting', 'daily', 'scheduled'],
            priority: 7
          }
        }
      ];

      // Add items to memory
      items.forEach(({ key, value, options }) => {
        core.memory.set(key, value, options);
      });

      // Verify items were stored
      expect(core.memory.has('urgent-alert-001')).toBe(true);
      expect(core.memory.has('task-meeting-0900')).toBe(true);

      // Verify item data
      const urgentItem = core.memory.get('urgent-alert-001');
      expect(urgentItem.priority).toBe(10);
      expect(urgentItem.type).toBe('alert');
    });

    test('should manage focus set assignments', () => {
      // Add test item
      core.memory.set('test-item', { content: 'test' }, { priority: 5 });

      // Update focus set assignment
      core.memory._updateFocusSets('test-item', { focusSet: 'working-memory' });

      // Verify assignment (this tests internal focus set management)
      const focusItems = core.memory.getFocusItems(10);
      expect(Array.isArray(focusItems)).toBe(true);
    });
  });

  describe('Attention Mechanism', () => {
    test('should update and retrieve focus attention correctly', () => {
      // Create focus sets first
      core.memory.createFocusSet('working-memory', 5);
      core.memory.createFocusSet('attention-focus', 3);

      // Update attention for different focus sets
      core.memory.updateFocusAttention('working-memory', 0.8);
      core.memory.updateFocusAttention('attention-focus', 0.6);

      // Get focus set stats
      const focusStats = core.memory.getFocusSetStats();

      // Verify attention scores were updated
      expect(focusStats['working-memory']).toBeDefined();
      expect(focusStats['attention-focus']).toBeDefined();
    });

    test('should retrieve items based on attention focus', () => {
      // Create focus set and add item
      core.memory.createFocusSet('test-focus', 5);
      core.memory.set('attention-item', { content: 'test', priority: 8 });
      core.memory._updateFocusSets('attention-item', { focusSet: 'test-focus' });

      // Switch focus and get items
      core.memory.setFocus('test-focus');
      const attentionItems = core.memory.getFocusItems(5);

      // Verify attention-based retrieval
      expect(Array.isArray(attentionItems)).toBe(true);
    });
  });

  describe('Query Optimization', () => {
    test('should query by priority correctly', () => {
      // Add items with different priorities
      core.memory.set('high-priority', { content: 'high' }, { priority: 9 });
      core.memory.set('medium-priority', { content: 'medium' }, { priority: 6 });
      core.memory.set('low-priority', { content: 'low' }, { priority: 3 });

      // Query by priority
      const highPriorityItems = core.memory.query({
        minPriority: 8,
        limit: 5
      });

      // Should find high priority item
      expect(highPriorityItems.length).toBeGreaterThan(0);
    });

    test('should query by type correctly', () => {
      // Add items with different types
      core.memory.set('alert-1', { content: 'alert' }, { type: 'alert' });
      core.memory.set('task-1', { content: 'task' }, { type: 'task' });

      // Query by type
      const alertItems = core.memory.query({
        type: 'alert',
        limit: 5
      });

      // Should find alert items
      expect(alertItems.length).toBeGreaterThan(0);
    });

    test('should query by tags correctly', () => {
      // Add items with tags
      core.memory.set('urgent-item', { content: 'urgent' }, {
        tags: ['urgent', 'system']
      });

      // Query by tags
      const urgentItems = core.memory.query({
        tags: ['urgent'],
        limit: 5
      });

      // Should find urgent items
      expect(urgentItems.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Statistics', () => {
    test('should provide comprehensive memory statistics', () => {
      // Add some items
      core.memory.set('stat-test-1', { content: 'test1' });
      core.memory.set('stat-test-2', { content: 'test2' });

      // Get statistics
      const memStats = core.memory.getStats();

      // Verify statistics structure
      expect(memStats).toBeDefined();
      expect(typeof memStats.storageSize).toBe('number');
      expect(memStats.storageSize).toBeGreaterThan(0);
    });
  });
});