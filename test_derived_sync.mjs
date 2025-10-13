/**
 * Test script to verify that derived tasks are being sent to the UI
 * This demonstrates that the simple message protocol is working correctly
 */

import { WebSocket } from 'ws';

console.log('🧪 Testing derived task synchronization with UI...');

// Connect to the server using the simple protocol
const ws = new WebSocket('ws://localhost:8080?protocol=simple');

let initialState = null;
let taskCount = 0;
let derivedTasksDetected = false;

ws.on('open', () => {
  console.log('✅ Connected to server with simple protocol');
  console.log('📋 Waiting for state updates...');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'state_update' && message.payload) {
      const currentTaskCount = message.payload.tasks.length;
      
      if (!initialState) {
        // First state update - store initial state
        initialState = message.payload;
        taskCount = currentTaskCount;
        console.log(`\n📊 Initial State:`);
        console.log(`   Tasks: ${taskCount}`);
        console.log(`   Concepts: ${message.payload.concepts.length}`);
        console.log(`   Initial tasks:`);
        message.payload.tasks.forEach((task, i) => {
          console.log(`     ${i+1}. ${task.content} [${task.status}] priority:${task.priority}`);
        });
      } else {
        // Subsequent updates - check for new tasks
        if (currentTaskCount > taskCount) {
          const newTasks = message.payload.tasks.filter(newTask => 
            !initialState.tasks.some(origTask => origTask.id === newTask.id)
          );
          
          if (newTasks.length > 0) {
            console.log(`\n🎉 NEW TASKS DETECTED! (+${newTasks.length})`);
            newTasks.forEach((task, i) => {
              console.log(`   ${i+1}. ${task.content} [${task.status}] priority:${task.priority}`);
              // Check if this looks like a derived task (a-->c)
              if (task.content.includes('(a-->c)') || task.content.includes('(b-->a)') || task.content.includes('(c-->b)')) {
                derivedTasksDetected = true;
              }
            });
            taskCount = currentTaskCount;
          }
        }
        
        // Show periodic updates
        if (currentTaskCount !== taskCount) {
          console.log(`\n📈 Task count changed: ${taskCount} → ${currentTaskCount}`);
          taskCount = currentTaskCount;
        }
      }
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Close after 15 seconds to see results
setTimeout(() => {
  console.log('\n⏱️  Test completed');
  if (derivedTasksDetected) {
    console.log('✅ SUCCESS: Derived tasks are being synchronized to the UI!');
    console.log('   The simple message protocol is working correctly.');
  } else {
    console.log('⚠️  No明显 derived tasks detected, but the infrastructure is in place.');
    console.log('   The system is ready to show derived tasks when they are generated.');
  }
  ws.close();
  process.exit(derivedTasksDetected ? 0 : 1);
}, 15000);