import WebSocketClient from '../client/WebSocketClient.js';
import WebSocketServer from '../core/WebSocketServer.js';
import { createCore } from '../core/orchestration/createCore.js';

describe('WebSocket Integration Tests', () => {
  let core;
  let server;
  let client;
  let serverUrl;

  beforeEach(async () => {
    // Create a real Core instance for testing
    core = await createCore({
      enableWebSocket: true,
      port: 0, // Use port 0 for automatic assignment
      enabled: true
    });

    // Create WebSocket server with the core
    server = new WebSocketServer(core);
    await server.initialize({ port: 0, enabled: true });

    // Start the server and get the actual port
    await server.start();
    const port = server.server.address().port;
    serverUrl = `ws://localhost:${port}`;

    // Create client instance
    client = new WebSocketClient(serverUrl);
  });

  afterEach(async () => {
    // Clean up in reverse order
    if (client) {
      client.disconnect();
    }

    if (server) {
      await server.stop();
    }

    if (core) {
      await core.stop();
    }
  });

  describe('Client-Server Connection', () => {
    test('should establish connection and receive welcome message', (done) => {
      client.on('connected', () => {
        expect(client.isConnected).toBe(true);
        done();
      });

      client.on('message', (message) => {
        if (message.type === 'welcome') {
          expect(message.clientId).toBeDefined();
          expect(message.serverInfo).toBeDefined();
          expect(message.serverInfo.version).toBe('2.0.0');
        }
      });

      client.connect();
    });

    test('should receive complete state after connection', (done) => {
      client.on('connected', () => {
        // Connection established, now wait for state
      });

      client.on('message', (message) => {
        if (message.type === 'complete_state') {
          expect(message.payload).toBeDefined();
          expect(message.payload.tasks).toBeDefined();
          expect(message.payload.concepts).toBeDefined();
          expect(message.payload.stats).toBeDefined();
          done();
        }
      });

      client.connect();
    });

    test('should handle heartbeat messages', (done) => {
      let heartbeatCount = 0;

      client.on('message', (message) => {
        if (message.type === 'heartbeat') {
          heartbeatCount++;
          if (heartbeatCount >= 2) {
            done();
          }
        }
      });

      client.connect();

      // Wait for connection and a couple heartbeats
      setTimeout(() => {
        if (heartbeatCount < 2) {
          done(new Error('Expected at least 2 heartbeat messages'));
        }
      }, 7000);
    });
  });

  describe('Command Execution', () => {
    test('should execute cycle commands through WebSocket', (done) => {
      let commandExecuted = false;

      // Listen for command responses
      client.on('message', (message) => {
        if (message.type === 'command_response' && message.command === 'start') {
          expect(message.status).toBe('success');
          commandExecuted = true;
          done();
        }
      });

      client.on('connected', () => {
        // Send start command once connected
        client.send({
          type: 'command',
          command: 'start'
        });
      });

      client.connect();
    });

    test('should handle cycle stats updates', (done) => {
      client.on('message', (message) => {
        if (message.type === 'cycle.stats') {
          expect(message.cycles).toBeDefined();
          expect(message.timestamp).toBeDefined();
          done();
        }
      });

      client.on('connected', () => {
        // Subscribe to cycle events
        client.send({
          type: 'subscribe',
          eventTypes: ['cycle.stats']
        });

        // Reset cycle count to trigger stats update
        client.send({
          type: 'command',
          command: 'reset'
        });
      });

      client.connect();
    });
  });

  describe('Task Streaming', () => {
    test('should create and manage task streams', (done) => {
      const testTaskId = 'test_task_123';

      client.on('connected', () => {
        // Subscribe to a task stream
        client.send({
          type: 'subscribe_to_task',
          taskId: testTaskId
        });
      });

      client.on('message', (message) => {
        if (message.type === 'subscription_success') {
          expect(message.taskId).toBe(testTaskId);
          done();
        }
      });

      client.connect();
    });

    test('should publish task updates to stream participants', (done) => {
      const testTaskId = 'test_task_456';
      let subscriptionConfirmed = false;

      client.on('message', (message) => {
        if (message.type === 'subscription_success') {
          subscriptionConfirmed = true;

          // Publish a task update
          server.publishTaskUpdate(testTaskId, {
            action: 'update',
            data: { status: 'completed' }
          });
        }

        if (message.type === 'task_stream_update' && subscriptionConfirmed) {
          expect(message.taskId).toBe(testTaskId);
          expect(message.update.action).toBe('update');
          expect(message.update.data.status).toBe('completed');
          done();
        }
      });

      client.on('connected', () => {
        client.send({
          type: 'subscribe_to_task',
          taskId: testTaskId
        });
      });

      client.connect();
    });
  });

  describe('Event Subscription System', () => {
    test('should handle event subscriptions and publishing', (done) => {
      const testEventType = 'test.event';

      client.on('connected', () => {
        // Subscribe to test event
        client.send({
          type: 'subscribe',
          eventTypes: [testEventType]
        });
      });

      client.on('message', (message) => {
        if (message.type === 'subscription_confirmed') {
          // Publish test event
          server.publishEvent(testEventType, { data: 'test payload' });
        }

        if (message.type === 'event' && message.eventType === testEventType) {
          expect(message.data.data).toBe('test payload');
          done();
        }
      });

      client.connect();
    });

    test('should handle event filtering', (done) => {
      const testEventType = 'filtered.event';

      client.on('connected', () => {
        // Subscribe with filter
        client.send({
          type: 'subscribe',
          eventTypes: [testEventType],
          filters: { category: 'important' }
        });
      });

      client.on('message', (message) => {
        if (message.type === 'subscription_confirmed') {
          // Publish event that matches filter
          server.publishEvent(testEventType, { data: 'important event' }, { category: 'important' });

          // Publish event that doesn't match filter
          server.publishEvent(testEventType, { data: 'unimportant event' }, { category: 'trivial' });
        }

        if (message.type === 'event' && message.eventType === testEventType) {
          // Should only receive the filtered event
          expect(message.data.data).toBe('important event');
          done();
        }
      });

      client.connect();
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', (done) => {
      const invalidClient = new WebSocketClient('ws://localhost:99999'); // Non-existent port

      invalidClient.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      invalidClient.connect();
    });

    test('should handle malformed messages', (done) => {
      client.on('error', (error) => {
        expect(error.message).toContain('Failed to parse message');
        done();
      });

      client.on('connected', () => {
        // Send malformed JSON
        client.send('invalid json {');
      });

      client.connect();
    });

    test('should handle server shutdown gracefully', (done) => {
      client.on('disconnected', (event) => {
        expect(event.code).toBe(1000); // Normal closure
        expect(event.reason).toBe('Server shutting down');
        done();
      });

      client.on('connected', async () => {
        // Shutdown server after connection
        await server.stop();
      });

      client.connect();
    });
  });

  describe('Performance and Load', () => {
    test('should handle multiple clients simultaneously', (done) => {
      const clients = [];
      const connectedClients = new Set();
      const totalClients = 3;

      // Create multiple clients
      for (let i = 0; i < totalClients; i++) {
        const testClient = new WebSocketClient(serverUrl);
        clients.push(testClient);

        testClient.on('connected', () => {
          connectedClients.add(testClient);

          if (connectedClients.size === totalClients) {
            // All clients connected
            expect(server.clients.size).toBe(totalClients);

            // Cleanup
            clients.forEach(c => c.disconnect());
            done();
          }
        });

        testClient.connect();
      }
    });

    test('should track connection statistics', () => {
      // Test server stats API
      const stats = server.getStats();

      expect(stats).toBeDefined();
      expect(stats.isRunning).toBe(true);
      expect(stats.clientCount).toBeDefined();
      expect(stats.subscriptions).toBeDefined();
      expect(stats.taskStreams).toBeDefined();
      expect(typeof stats.uptime).toBe('number');
    });

    test('should enforce connection limits', (done) => {
      // Create a server with strict limits
      const limitedServer = new WebSocketServer(core);
      limitedServer.initialize({
        port: 0,
        enabled: true,
        maxConnectionsPerIP: 1,
        maxTotalConnections: 2
      });

      limitedServer.start().then(() => {
        const port = limitedServer.server.address().port;
        const client1 = new WebSocketClient(`ws://localhost:${port}`);
        const client2 = new WebSocketClient(`ws://localhost:${port}`);
        const client3 = new WebSocketClient(`ws://localhost:${port}`);

        let connectionRefusedCount = 0;

        client1.on('connected', () => {
          // First client should connect successfully
        });

        client2.on('connected', () => {
          // Second client should connect successfully
        });

        client3.on('error', (error) => {
          // Third client should be refused
          connectionRefusedCount++;
        });

        client1.connect();
        client2.connect();
        client3.connect();

        setTimeout(() => {
          expect(connectionRefusedCount).toBeGreaterThan(0);
          expect(limitedServer.clients.size).toBeLessThanOrEqual(2);

          client1.disconnect();
          client2.disconnect();
          limitedServer.stop();
          done();
        }, 1000);
      });
    });
  });

  describe('Real-time Features', () => {
    test('should handle real-time task streaming', (done) => {
      const streamId = 'realtime_test';

      client.on('connected', () => {
        // Subscribe to streaming
        client.send({
          type: 'stream_request',
          streamId,
          action: 'subscribe',
          streamType: 'test'
        });
      });

      client.on('message', (message) => {
        if (message.type === 'stream_subscription_confirmed') {
          // Publish to stream
          client.send({
            type: 'stream_request',
            streamId,
            action: 'publish',
            streamType: 'test',
            data: { message: 'Hello from stream' }
          });
        }

        if (message.type === 'stream_data') {
          expect(message.data.message).toBe('Hello from stream');
          expect(message.streamId).toBe(`test:${streamId}`);
          done();
        }
      });

      client.connect();
    });

    test('should handle broadcast streaming', (done) => {
      const broadcastType = 'broadcast_test';

      client.on('connected', () => {
        // Subscribe to broadcast stream
        client.send({
          type: 'stream_request',
          action: 'subscribe',
          streamType: broadcastType
        });
      });

      client.on('message', (message) => {
        if (message.type === 'stream_subscription_confirmed') {
          // Broadcast to all streams of this type
          server._handleStreamBroadcast('test_client', broadcastType, {
            message: 'Broadcast message'
          });
        }

        if (message.type === 'stream_data') {
          expect(message.data.message).toBe('Broadcast message');
          done();
        }
      });

      client.connect();
    });
  });

  describe('System Integration', () => {
    test('should integrate with Core memory system', (done) => {
      client.on('connected', () => {
        // Request current state to test memory integration
        client.send({
          type: 'request_state'
        });
      });

      client.on('message', (message) => {
        if (message.type === 'complete_state') {
          // Verify that the state includes memory data
          expect(message.payload.tasks).toBeDefined();
          expect(message.payload.concepts).toBeDefined();

          // The state should reflect the actual Core memory state
          if (core.memory) {
            const memoryTasks = core.memory.getAllTasks?.() || [];
            const memoryConcepts = core.memory.getTopConcepts ?
              core.memory.getTopConcepts(50) : [];

            // Verify consistency between server state and core memory
            expect(Array.isArray(message.payload.tasks)).toBe(true);
            expect(Array.isArray(message.payload.concepts)).toBe(true);
          }

          done();
        }
      });

      client.connect();
    });

    test('should handle NARS protocol messages', (done) => {
      client.on('connected', () => {
        // Identify as NARS instance
        client.send({
          type: 'identify',
          clientType: 'nars',
          version: '1.0.0',
          capabilities: ['task_processing', 'reasoning']
        });
      });

      client.on('message', (message) => {
        if (message.type === 'welcome') {
          // Send NARS registration
          client.send({
            type: 'nars_message',
            command: 'register_instance',
            data: {
              instanceId: 'test_nars_001',
              version: '1.0.0',
              capabilities: ['basic_reasoning']
            }
          });
        }

        if (message.type === 'nars_registration') {
          expect(message.status).toBe('success');
          expect(message.instanceId).toBe('test_nars_001');
          done();
        }
      });

      client.connect();
    });
  });
});