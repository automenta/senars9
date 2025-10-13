// Simple test client to verify the websocket server works correctly
import WebSocket from 'ws';
import * as Y from 'yjs';

// Create a Yjs document like the UI would
const doc = new Y.Doc();
const yTasks = doc.getArray('tasks');
const yConcepts = doc.getArray('concepts');
const yLogs = doc.getArray('logs');

console.log('Connecting to SeNARS server...');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to SeNARS server');
  
  // Send a test task
  console.log('Sending test task...');
  const addTaskMessage = {
    type: 'control',
    command: 'add_task',
    payload: {
      content: 'Test task from client',
      priority: 0.8,
      status: 'Input',
      type: 'Input'
    }
  };
  
  ws.send(JSON.stringify(addTaskMessage));
});

ws.on('message', (data) => {
  console.log('Received message from server:', data.toString());
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});