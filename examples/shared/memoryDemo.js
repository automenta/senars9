/**
 * @file: examples/shared/memoryDemo.js
 * @description: Shared functionality for memory demonstration used by both tests and examples
 */

import createCore from '../../core/orchestration/createCore.js';

// Export the main functionality for both tests and examples to use
export async function demonstrateMemorySystem() {
  const core = await createCore();

  try {
    // 1. Create focus sets for different attention areas
    core.memory.focus.createFocusSet('working-memory', 5);
    core.memory.focus.createFocusSet('long-term-storage', 10);
    core.memory.focus.createFocusSet('attention-focus', 3);
    core.memory.focus.createFocusSet('pattern-buffer', 8);

    // 2. Set current focus to working memory
    core.memory.focus.setFocus('working-memory');

    // 3. Add items with different priorities and metadata
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
      },
      {
        key: 'pattern-traffic-001',
        value: {
          content: 'Unusual traffic pattern detected on port 443',
          priority: 8,
          type: 'pattern',
          dataPoints: 150
        },
        options: {
          type: 'pattern',
          tags: ['traffic', 'security', 'analysis'],
          priority: 8
        }
      },
      {
        key: 'reference-docs',
        value: {
          content: 'System architecture documentation',
          priority: 3,
          type: 'reference',
          lastUpdated: new Date().toISOString()
        },
        options: {
          type: 'reference',
          tags: ['documentation', 'architecture'],
          priority: 3
        }
      }
    ];

    // Add items to memory
    items.forEach(({ key, value, options }) => {
      core.memory.set(key, value, options);
    });

    // 4. Demonstrate focus set management
    core.memory.focus.updateFocusSets('urgent-alert-001', { focusSet: 'working-memory' });
    core.memory.focus.updateFocusSets('task-meeting-0900', { focusSet: 'working-memory' });
    core.memory.focus.updateFocusSets('pattern-traffic-001', { focusSet: 'attention-focus' });
    core.memory.focus.updateFocusSets('reference-docs', { focusSet: 'long-term-storage' });

    // Get items from current focus
    const focusItems = core.memory.focus.getFocusItems(3);

    // 5. Demonstrate attention mechanism
    core.memory.focus.updateFocusAttention('working-memory', 0.8);
    core.memory.focus.updateFocusAttention('attention-focus', 0.6);
    core.memory.focus.updateFocusAttention('long-term-storage', 0.2);

    const focusStats = core.memory.focus.getFocusSetStats();

    // 6. Demonstrate query optimization
    const highPriorityItems = core.memory.query({
      minPriority: 8,
      limit: 5
    });

    const alertItems = core.memory.query({
      type: 'alert',
      limit: 5
    });

    const urgentItems = core.memory.query({
      tags: ['urgent'],
      limit: 5
    });

    // 7. Get memory statistics
    const memStats = core.memory.getStats();

    // 8. Demonstrate attention-based sorting
    core.memory.focus.setFocus('attention-focus');
    const attentionItems = core.memory.focus.getFocusItems(5);

    // Return results for verification
    return {
      focusItems,
      focusStats,
      highPriorityItems,
      alertItems,
      urgentItems,
      memStats,
      attentionItems,
      totalItems: items.length
    };

  } finally {
    await core.stop();
    await core.destroy();
  }
}