import { WebSocket } from 'ws';

console.log('Testing with explicit start command to activate reasoning...');

const ws = new WebSocket('ws://localhost:8080?protocol=simple');

let initialTasks = null;
let sawNewTasks = false;

ws.on('open', () => {
  console.log('✅ Connected to server');
  
  // Send start command to initiate active reasoning
  setTimeout(() => {
    console.log('\\n🚀 Sending START command to activate reasoning...');
    ws.send(JSON.stringify({
      type: 'control',
      command: 'start'
    }));
  }, 2000);
  
  // Then send a step command to force a single reasoning cycle
  setTimeout(() => {
    console.log('\\n🔄 Sending STEP command to force single reasoning cycle...');
    ws.send(JSON.stringify({
      type: 'control',
      command: 'step'
    }));
  }, 4000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'state_update' && message.payload) {
    const currentTaskCount = message.payload.tasks.length;
    
    if (initialTasks === null) {
      // First message
      initialTasks = [...message.payload.tasks];
      console.log(`\\n📋 Initial State: ${currentTaskCount} tasks, ${message.payload.concepts.length} concepts`);
      message.payload.tasks.forEach((task, i) => {
        console.log(`   ${i+1}. ${task.content} [${task.status}]`);
      });
    } else {
      // Check if new tasks appeared
      const newTasks = message.payload.tasks.filter(newTask => 
        !initialTasks.some(origTask => origTask.id === newTask.id)
      );
      
      if (newTasks.length > 0) {
        console.log(`\\n🎉 NEW TASKS DETECTED! (${newTasks.length} new)`);
        newTasks.forEach((task, i) => {
          console.log(`   ${i+1}. ${task.content} [${task.status}]`);
        });
        sawNewTasks = true;
      }
    }
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

setTimeout(() => {
  console.log('\\n🏁 Test completed');
  console.log(`\\n📊 Results: New tasks detected: ${sawNewTasks ? 'YES' : 'NO'}`);
  ws.close();
}, 12000);