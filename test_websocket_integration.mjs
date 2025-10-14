import { test, describe } from 'node:test';
import { WebSocketServer } from './WebSocketServer.js';
import WebSocket from 'ws';
import assert from 'assert';

// Simple test runner for WebSocket integration
async function runTests() {
  console.log('Starting WebSocket integration tests...\n');
  
  // Test 1: Server startup and WebSocket connection
  await test('should start and accept WebSocket connections', async (t) => {
    const server = new WebSocketServer(8085);
    await server.start();
    
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8085');
        
        ws.on('open', () => {
          console.log('✓ Client connected successfully');
          assert.strictEqual(ws.readyState, 1); // WebSocket.OPEN
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      });
    } finally {
      await server.stop();
    }
  });
  
  // Test 2: Control command handling
  await test('should handle control commands', async (t) => {
    const server = new WebSocketServer(8086);
    await server.start();
    
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8086');
        
        ws.on('open', () => {
          // Send a start command
          ws.send(JSON.stringify({
            type: 'control',
            command: 'start'
          }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('Received message:', message);
          
          // Check if we got a system event back
          if (message.type === 'system_event' && message.event === 'reasoning_started') {
            console.log('✓ Control command handled correctly');
            assert.strictEqual(message.event, 'reasoning_started');
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      });
    } finally {
      await server.stop();
    }
  });
  
  // Test 3: Task addition
  await test('should handle task addition', async (t) => {
    const server = new WebSocketServer(8087);
    await server.start();
    
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8087');
        
        ws.on('open', () => {
          // Send an add_task command
          ws.send(JSON.stringify({
            type: 'control',
            command: 'add_task',
            payload: {
              content: 'Test task from client',
              priority: 0.8
            }
          }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('Received message:', message);
          
          // Check if we got a task_added event back
          if (message.type === 'task_added' && message.data.content === 'Test task from client') {
            console.log('✓ Task addition handled correctly');
            assert.strictEqual(message.data.content, 'Test task from client');
            assert.strictEqual(message.data.priority, 0.8);
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      });
    } finally {
      await server.stop();
    }
  });
  
  // Test 4: State requests
  await test('should handle state requests', async (t) => {
    const server = new WebSocketServer(8088);
    await server.start();
    
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8088');
        
        ws.on('open', () => {
          // Send a state request
          ws.send(JSON.stringify({
            type: 'request_state'
          }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('Received state:', message);
          
          // Check if we got a state_update back
          if (message.type === 'state_update') {
            console.log('✓ State request handled correctly');
            assert.ok(message.payload.tasks !== undefined);
            assert.ok(message.payload.concepts !== undefined);
            assert.ok(message.payload.logs !== undefined);
            assert.ok(message.payload.stats !== undefined);
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      });
    } finally {
      await server.stop();
    }
  });
  
  // Test 5: Get concepts command
  await test('should handle get_concepts command', async (t) => {
    const server = new WebSocketServer(8089);
    await server.start();
    
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8089');
        
        ws.on('open', () => {
          // Send get_concepts command
          ws.send(JSON.stringify({
            type: 'control',
            command: 'get_concepts'
          }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('Received concepts:', message);
          
          // Check if we got concepts back
          if (message.type === 'concepts_update') {
            console.log('✓ Get concepts command handled correctly');
            assert.ok(Array.isArray(message.payload));
            assert.ok(message.payload.length > 0);
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      });
    } finally {
      await server.stop();
    }
  });
  
  console.log('\n✓ All WebSocket integration tests completed successfully!');
}

// Run the tests if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runTests().catch(error => {
    console.error('\n✗ Test execution failed:', error);
    process.exit(1);
  });
}