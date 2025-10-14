import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { WebSocketClient } from './WebSocketClient.js';

class SimpleWebSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.clients = new Set();
    this.clientIdCounter = 0;
    
    // Connect to the core system
    this.client = new WebSocketClient();
    
    // Set up message handlers
    this.setupHandlers();
  }

  setupHandlers() {
    this.wss.on('connection', (ws, request) => {
      const clientId = `client_${++this.clientIdCounter}`;
      this.clients.add({ id: clientId, ws });
      
      console.log(`Client connected: ${clientId}`);
      
      // Send initial state to new client
      this.sendInitialState(ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message, ws);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(this.findClientById(clientId));
        console.log(`Client disconnected: ${clientId}`);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  findClientById(clientId) {
    for (const client of this.clients) {
      if (client.id === clientId) {
        return client;
      }
    }
    return null;
  }

  sendInitialState(ws) {
    // Send initial state to newly connected client
    const initialState = {
      type: 'state_update',
      payload: {
        tasks: [],
        concepts: [],
        logs: [
          { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
          { id: 'log-2', message: 'UI connected to server', timestamp: Date.now() }
        ],
        stats: {
          isRunning: false,
          isPaused: true,
          cycles: 0,
          tasks: 0,
          concepts: 0,
          timestamp: Date.now()
        }
      }
    };
    
    ws.send(JSON.stringify(initialState));
  }

  async handleMessage(clientId, message, ws) {
    console.log('Received message from client:', clientId, message);
    
    switch (message.type) {
      case 'control':
        await this.handleControlCommand(message.command, message.payload, clientId);
        break;
      case 'request_state':
        this.sendCurrentState(ws);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  async handleControlCommand(command, payload, clientId) {
    console.log('Handling control command:', command, payload);
    
    switch (command) {
      case 'start':
        this.broadcast({
          type: 'system_event',
          event: 'reasoning_started',
          timestamp: Date.now()
        });
        break;
        
      case 'stop':
        this.broadcast({
          type: 'system_event',
          event: 'reasoning_stopped',
          timestamp: Date.now()
        });
        break;
        
      case 'step':
        // Simulate a reasoning step
        const newTask = {
          id: `task_${Date.now()}`,
          content: `Simulated task from step ${Math.floor(Math.random() * 1000)}`,
          priority: 0.5 + Math.random() * 0.4,
          status: 'Input',
          type: 'Input',
          createdAt: Date.now(),
          lastModified: Date.now()
        };
        
        this.broadcast({
          type: 'task_derived',
          data: newTask,
          timestamp: Date.now()
        });
        break;
        
      case 'reset':
        this.broadcast({
          type: 'system_event',
          event: 'system_reset',
          timestamp: Date.now()
        });
        break;
        
      case 'add_task':
        if (payload.content) {
          const newTask = {
            id: payload.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: payload.content,
            priority: payload.priority || 0.5,
            status: payload.status || 'Input',
            type: payload.type || 'Input',
            createdAt: Date.now(),
            lastModified: Date.now()
          };
          
          this.broadcast({
            type: 'task_added',
            data: newTask,
            timestamp: Date.now()
          });
        }
        break;
        
      case 'get_concepts':
        // Send concept data to requesting client only
        const concepts = [
          { id: 'concept-a', content: 'a', priority: 0.9 },
          { id: 'concept-b', content: 'b', priority: 0.8 },
          { id: 'concept-c', content: 'c', priority: 0.7 }
        ];
        
        this.sendToClient(clientId, {
          type: 'concepts_update',
          payload: concepts
        });
        break;
        
      case 'get_top_tasks':
        // Send top tasks to requesting client only
        const topTasks = [
          {
            id: 'task-1',
            content: '(a-->b).',
            priority: 0.9,
            status: 'Input',
            type: 'Input',
            createdAt: Date.now(),
            lastModified: Date.now()
          },
          {
            id: 'task-2',
            content: '(b-->c).',
            priority: 0.8,
            status: 'Input',
            type: 'Input',
            createdAt: Date.now(),
            lastModified: Date.now()
          }
        ];
        
        this.sendToClient(clientId, {
          type: 'top_tasks_update',
          payload: topTasks
        });
        break;
        
      default:
        console.log('Unknown command:', command);
    }
  }

  sendCurrentState(ws) {
    const state = {
      type: 'state_update',
      payload: {
        tasks: [],
        concepts: [],
        logs: [
          { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
          { id: 'log-2', message: 'Current state requested', timestamp: Date.now() }
        ],
        stats: {
          isRunning: false,
          isPaused: true,
          cycles: Math.floor(Math.random() * 100),
          tasks: Math.floor(Math.random() * 10),
          concepts: Math.floor(Math.random() * 5),
          timestamp: Date.now()
        }
      }
    };
    
    ws.send(JSON.stringify(state));
  }

  sendToClient(clientId, message) {
    for (const client of this.clients) {
      if (client.id === clientId && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
        return true;
      }
    }
    return false;
  }

  broadcast(message) {
    for (const client of this.clients) {
      if (client.ws.readyState === 1) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to client:', error);
          // Remove client if connection is broken
          this.clients.delete(client);
        }
      }
    }
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`Simple WebSocket Server running on ws://0.0.0.0:${this.port}`);
        resolve();
      });
      
      this.server.on('error', (error) => {
        console.error('Server error:', error);
        reject(error);
      });
    });
  }

  async stop() {
    for (const client of this.clients) {
      client.ws.close();
    }
    this.clients.clear();
    
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('WebSocket server stopped');
        resolve();
      });
    });
  }
}

export { SimpleWebSocketServer as WebSocketServer };
export default SimpleWebSocketServer;

// If this file is run directly, start the server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new SimpleWebSocketServer(port);
  
  server.start()
    .then(() => {
      console.log('Server started successfully');
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.stop();
    process.exit(0);
  });
}