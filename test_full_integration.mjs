import { test } from 'node:test';
import { WebSocketServer } from './WebSocketServer.js';
import { WebSocketClient } from './WebSocketClient.js';
import WebSocket from 'ws';
import assert from 'assert';
import { setTimeout } from 'timers/promises';

// Comprehensive integration test
async function runFullIntegrationTest() {
  console.log('Starting full integration test...\n');
  
  // Test 1: Initialize the WebSocketClient to connect to the core system
  console.log('1. Initializing WebSocketClient to connect to SeNARS core...');
  const client = new WebSocketClient();
  const clientConnected = await client.connect();
  assert.strictEqual(clientConnected, true, 'WebSocketClient should connect to core system');
  console.log('✓ WebSocketClient connected to SeNARS core system\n');
  
  // Test 2: Start WebSocketServer and connect UI
  console.log('2. Starting WebSocketServer for UI connections...');
  const server = new WebSocketServer(8090);
  await server.start();
  console.log('✓ WebSocketServer started on port 8090\n');
  
  // Test 3: Connect UI client to server and test integration
  console.log('3. Testing UI integration with server...');
  
  await new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8090');
    let receivedInitialState = false;
    
    ws.on('open', () => {
      console.log('   - UI client connected to server');
    });
    
    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'state_update' && !receivedInitialState) {
        console.log('   - Received initial state from server');
        receivedInitialState = true;
        
        // Now test adding a task through the UI
        console.log('   - Sending task addition command from UI...');
        ws.send(JSON.stringify({
          type: 'control',
          command: 'add_task',
          payload: {
            content: '(dog --> mammal).',
            priority: 0.8
          }
        }));
      } else if (message.type === 'task_added') {
        console.log('   - Received task_added confirmation');
        assert.strictEqual(message.data.content, '(dog --> mammal).');
        assert.strictEqual(message.data.priority, 0.8);
        
        // Test step command to generate derived tasks
        console.log('   - Sending step command to trigger reasoning...');
        ws.send(JSON.stringify({
          type: 'control',
          command: 'step'
        }));
      } else if (message.type === 'task_derived' || 
                 (message.type === 'system_event' && message.event === 'reasoning_started')) {
        console.log('   - Received system event from reasoning step');
        
        // Test getting concepts
        console.log('   - Requesting concepts...');
        ws.send(JSON.stringify({
          type: 'control',
          command: 'get_concepts'
        }));
      } else if (message.type === 'concepts_update') {
        console.log('   - Received concepts update');
        assert.ok(Array.isArray(message.payload));
        
        // Close connection and finish test
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
  });
  
  console.log('✓ UI integration test completed successfully\n');
  
  // Test 4: Test direct core system interaction through client
  console.log('4. Testing direct interaction with SeNARS core...');
  
  try {
    // Add a task directly through the client
    const result = await client.addTask('(cat --> feline).', 0.9);
    console.log('   - Added task directly to core system:', result.content);
    assert.strictEqual(result.content, '(cat --> feline).');
    assert.strictEqual(result.priority, 0.9);
    
    // Execute a command directly through the client
    const cmdResult = await client.executeCommand('step');
    console.log('   - Executed command on core system:', cmdResult.command);
    assert.strictEqual(cmdResult.command, 'step');
    
    // Get system status
    const status = await client.getSystemStatus();
    console.log('   - Retrieved system status');
    assert.ok(status.isConnected !== undefined);
    
    console.log('✓ Direct core interaction test completed successfully\n');
  } catch (error) {
    console.error('Error in direct core interaction:', error);
    throw error;
  }
  
  // Clean up
  console.log('5. Cleaning up resources...');
  await server.stop();
  await client.disconnect();
  console.log('✓ Resources cleaned up successfully\n');
  
  console.log('✓ All integration tests completed successfully!');
  console.log('\nThe simplified 2-file solution (WebSocketServer.js and WebSocketClient.js)'); 
  console.log('successfully enables the React UI to connect to and interact with the SeNARS core system.');
}

// Run the full integration test if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runFullIntegrationTest().catch(error => {
    console.error('\n✗ Full integration test failed:', error);
    process.exit(1);
  });
}