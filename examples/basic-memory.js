#!/usr/bin/env node

/**
 * @file: examples/basic-memory.js
 * @description: Basic usage example demonstrating enhanced Memory component with focus sets and attention
 */

import createCore from '../core/createCore.js';

async function demonstrateMemorySystem() {
  console.log('🧠 SeNARS v2 - Enhanced Memory System Demo\n');

  const core = await createCore();

  try {
    // 1. Create focus sets for different attention areas
    console.log('📁 Creating focus sets for attention management...');

    core.memory.createFocusSet('working-memory', 5);
    core.memory.createFocusSet('long-term-storage', 10);
    core.memory.createFocusSet('attention-focus', 3);
    core.memory.createFocusSet('pattern-buffer', 8);

    // 2. Set current focus to working memory
    core.memory.setFocus('working-memory');
    console.log('🎯 Set focus to: working-memory');

    // 3. Add items with different priorities and metadata
    console.log('\n💾 Adding items to memory with attention scoring...');

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
    console.log('\n🎪 Working with focus sets...');

    // Add items to specific focus sets
    core.memory._updateFocusSets('urgent-alert-001', { focusSet: 'working-memory' });
    core.memory._updateFocusSets('task-meeting-0900', { focusSet: 'working-memory' });
    core.memory._updateFocusSets('pattern-traffic-001', { focusSet: 'attention-focus' });
    core.memory._updateFocusSets('reference-docs', { focusSet: 'long-term-storage' });

    // Get items from current focus
    const focusItems = core.memory.getFocusItems(3);
    console.log(`📋 Retrieved ${focusItems.length} items from working-memory focus`);

    focusItems.forEach(([key, value]) => {
      console.log(`   - ${key}: ${value.content} (priority: ${value.priority})`);
    });

    // 5. Demonstrate attention mechanism
    console.log('\n🧘 Testing attention mechanism...');

    // Update attention for different focus sets
    core.memory.updateFocusAttention('working-memory', 0.8);
    core.memory.updateFocusAttention('attention-focus', 0.6);
    core.memory.updateFocusAttention('long-term-storage', 0.2);

    const focusStats = core.memory.getFocusSetStats();
    console.log('📊 Focus set attention scores:');
    Object.entries(focusStats).forEach(([name, stats]) => {
      console.log(`   ${name}: ${(stats.attentionScore * 100).toFixed(1)}% attention`);
    });

    // 6. Demonstrate query optimization
    console.log('\n🔍 Testing query optimization...');

    // Query by priority
    const highPriorityItems = core.memory.query({
      minPriority: 8,
      limit: 5
    });
    console.log(`Found ${highPriorityItems.length} high priority items`);

    // Query by type
    const alertItems = core.memory.query({
      type: 'alert',
      limit: 5
    });
    console.log(`Found ${alertItems.length} alert items`);

    // Query by tags
    const urgentItems = core.memory.query({
      tags: ['urgent'],
      limit: 5
    });
    console.log(`Found ${urgentItems.length} urgent items`);

    // 7. Demonstrate memory statistics
    console.log('\n📈 Memory system statistics:');
    const memStats = core.memory.getStats();
    console.log(`   Storage size: ${memStats.storageSize} items`);
    console.log(`   Cache size: ${memStats.cacheSize} items`);
    console.log(`   Focus sets: ${memStats.focusSets ? Object.keys(memStats.focusSets).length : 0}`);
    console.log(`   Indexes: ${memStats.indexes} active`);

    // 8. Demonstrate attention-based sorting
    console.log('\n🎯 Testing attention-based item retrieval...');

    // Switch focus and get items
    core.memory.setFocus('attention-focus');
    const attentionItems = core.memory.getFocusItems(5);
    console.log(`Retrieved ${attentionItems.length} items from attention-focus`);

    // Show how attention affects ordering
    attentionItems.forEach(([key, value], index) => {
      console.log(`   ${index + 1}. ${key} (priority: ${value.priority})`);
    });

  } finally {
    await core.stop();
    await core.destroy();
  }
}

// Run the demonstration
demonstrateMemorySystem().catch(console.error);