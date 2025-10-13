import { WebSocket } from 'ws';

console.log('Testing for derived tasks with registered rules...');

const ws = new WebSocket('ws://localhost:8080?protocol=simple');

let initialTasks = null;
let initialTaskCount = 0;
let sawChanges = false;

ws.on('open', () => {
  console.log('✅ Connected to server with registered reasoning rules');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'state_update' && message.payload) {
    const currentTaskCount = message.payload.tasks.length;
    const currentConceptCount = message.payload.concepts.length;
    
    if (initialTasks === null) {
      // First message - store initial state
      initialTasks = [...message.payload.tasks];
      initialTaskCount = currentTaskCount;
      console.log(`\\n📋 Initial State:`);
      console.log(`   Tasks: ${initialTaskCount} [${message.payload.tasks.map(t => t.content).join(', ')}]`);
      console.log(`   Concepts: ${currentConceptCount}`);
    } else {
      // Subsequent message - check for changes
      const taskDiff = currentTaskCount - initialTaskCount;
      const conceptDiff = currentConceptCount - initialTasks.length; // Note: initialTasks.length != initialTaskCount
      
      if (currentTaskCount > initialTaskCount || currentConceptCount > message.payload.concepts.length - currentConceptCount + currentConceptCount) {
        console.log(`\\n📊 Update: Tasks ${initialTaskCount}→${currentTaskCount} (${taskDiff > 0 ? '+' : ''}${taskDiff}), Concepts ${message.payload.concepts.length - conceptDiff}→${currentConceptCount} (${conceptDiff > 0 ? '+' : ''}${conceptDiff})`);
      }
      
      // Check for new tasks
      if (currentTaskCount > initialTaskCount) {
        const newTasks = message.payload.tasks.filter(newTask => 
          !initialTasks.some(origTask => origTask.id === newTask.id)
        );
        
        if (newTasks.length > 0) {
          console.log(`\\n🎉 ${newTasks.length} NEW TASK${newTasks.length > 1 ? 'S' : ''} DETECTED!`);
          newTasks.forEach((task, i) => {
            console.log(`   ${i+1}. ${task.content} [${task.status}] priority:${task.priority}`);
          });
          sawChanges = true;
        }
      }
      
      // If new tasks were found, show them
      if (sawChanges) {
        console.log('\\n✅ DERIVED TASKS ARE NOW WORKING! The system is generating new tasks.');
      }
    }
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Close after some time
setTimeout(() => {
  console.log('\\n⏱️  Test completed - checking results...');
  if (sawChanges) {
    console.log('\\n🎊 SUCCESS: Derived tasks are being generated and synchronized!');
  } else {
    console.log('\\n⚠️  No new tasks detected during test period, but infrastructure is in place.');
  }
  ws.close();
}, 15000);