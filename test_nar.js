#!/usr/bin/env node

/**
 * @file: test_nar.js
 * @description: Simple test for the NAR class
 */

import { NAR } from './core/NAR.js';

async function testNAR() {
  console.log('🧪 Testing NAR class...');
  
  // Create a NAR instance
  const nar = new NAR();
  console.log('✅ NAR created');
  
  // Input a task
  const task = nar.input({
    term: 'happy',
    punctuation: '!',  // goal
    truth: { frequency: 0.9, confidence: 0.9 }
  });
  console.log('✅ Task input:', task.toString());
  
  // Check tasks in memory
  const tasks = nar.getTasks();
  console.log(`📊 Memory contains ${tasks.length} task(s)`);
  
  // Get tasks by priority
  const priorityTasks = nar.getTasksByPriority();
  console.log(`📊 Priority-sorted tasks: ${priorityTasks.length}`);
  
  // Get memory state
  const memoryState = nar.getMemoryState();
  console.log('🧠 Memory state:', memoryState);
  
  // Get stats
  const stats = nar.getStats();
  console.log('📈 Stats:', stats);
  
  // Run a cycle
  nar.runCycle();
  console.log('🔄 Single cycle completed');
  
  // Check state after cycle
  const afterCycleStats = nar.getStats();
  console.log('📈 Stats after cycle:', afterCycleStats);
  
  console.log('🎉 NAR test completed successfully!');
}

testNAR().catch(console.error);