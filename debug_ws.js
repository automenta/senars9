// WebSocket test client to check if data exists on the server
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { applyUpdate, encodeStateAsUpdate } from 'yjs';

// Create a temporary Yjs document to sync with the server
const doc = new Y.Doc();
const tasks = doc.getArray('tasks');

// Listen for updates to the tasks array
tasks.observeDeep(() => {
    console.log('Tasks array updated. Current tasks:', tasks.toArray().map(task => 
        task instanceof Y.Map ? task.toJSON() : task
    ));
});

console.log('Connecting to WebSocket server...');
const ws = new WebSocket('ws://localhost:8080');

let connected = false;

ws.on('open', () => {
    console.log('Connected to WebSocket server');
    connected = true;
    
    // Send sync step 1 to request document state following Yjs protocol
    const syncMessage = new Uint8Array([0, 0]) // SYNC message type 0, sync step 0
    ws.send(syncMessage);
});

// Handle incoming messages following Yjs protocol
ws.on('message', (data) => {
    const buffer = new Uint8Array(data);
    const messageType = buffer[0];
    
    if (messageType === 0) { // SYNC
        const syncType = buffer[1];
        if (syncType === 1) { // SYNC_STEP_2
            // The update starts from index 2
            const update = buffer.slice(2);
            Y.applyUpdate(doc, update);
            
            console.log('Received document state from server');
            
            // Log current tasks
            const taskArray = tasks.toArray();
            console.log('Current tasks in doc after sync:', taskArray.length);
            taskArray.forEach((task, index) => {
                if (task instanceof Y.Map) {
                    console.log(`Task ${index}:`, task.toJSON());
                } else {
                    console.log(`Task ${index}:`, task);
                }
            });
        }
    }
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

ws.on('close', () => {
    console.log('WebSocket connection closed');
    if (!connected) {
        console.log('Connection failed - server may not be running');
    }
});