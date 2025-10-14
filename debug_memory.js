#!/usr/bin/env node

import System from './core/system/System.js';

async function debugMemory() {
  console.log('🔍 Testing memory methods...');
  
  const system = new System({
    components: {
      webSocketServer: {
        enabled: false
      }
    }
  });
  
  try {
    await system.start();
    
    // Check if the memory has the method mentioned in Core.js
    console.log('system.core.memory method existence check:');
    console.log('- getAllTasks:', typeof system.core.memory.getAllTasks);
    console.log('- getTopTasks:', typeof system.core.memory.getTopTasks);
    console.log('- getTopConcepts:', typeof system.core.memory.getTopConcepts);
    console.log('- conceptStorage:', system.core.memory.conceptStorage !== undefined);
    
    // Add a task
    await system.input({
      term: 'happy_test',
      punctuation: '!',
      truth: { frequency: 0.9, confidence: 0.9 }
    });
    
    // Try calling the methods from Core.js directly
    if (typeof system.core.memory.getAllTasks === 'function') {
      console.log('\\nTrying to call getAllTasks...');
      try {
        const tasks = system.core.memory.getAllTasks();
        console.log('getAllTasks result:', Array.isArray(tasks) ? `Array with ${tasks.length} items` : typeof tasks);
        if (Array.isArray(tasks) && tasks.length > 0) {
          console.log('First task:', JSON.stringify(tasks[0]).substring(0, 200) + '...');
        }
      } catch (e) {
        console.log('Error calling getAllTasks:', e.message);
      }
    }
    
    // Check if the Core has the _getTasksSnapshot method
    console.log('\\nChecking Core methods:');
    console.log('_getTasksSnapshot:', typeof system.core._getTasksSnapshot);
    
    if (typeof system.core._getTasksSnapshot === 'function') {
      try {
        const snapshot = system.core._getTasksSnapshot();
        console.log('_getTasksSnapshot result:', Array.isArray(snapshot) ? `Array with ${snapshot.length} items` : typeof snapshot);
        if (Array.isArray(snapshot) && snapshot.length > 0) {
          console.log('First snapshot item:', JSON.stringify(snapshot[0]).substring(0, 200) + '...');
        }
      } catch (e) {
        console.log('Error calling _getTasksSnapshot:', e.message);
      }
    }
    
    await system.stop();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugMemory().catch(console.error);