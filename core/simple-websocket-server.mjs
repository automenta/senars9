// Simple WebSocket server without CRDT
import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';

// Note: WebSocket is available as a property of WebSocketServer

class SimpleWebSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.tasks = [];
    this.concepts = [];
    this.logs = [];
    this.clients = new Set();
    
    // Add initial tasks
    this.tasks = [
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
    
    this.concepts = [
      { id: 'concept-a', content: 'a', priority: 0.9 },
      { id: 'concept-b', content: 'b', priority: 0.8 },
      { id: 'concept-c', content: 'c', priority: 0.7 }
    ];
    
    this.logs = [
      { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
      { id: 'log-2', message: 'Initial tasks loaded: (a-->b)., (b-->c).', timestamp: Date.now() }
    ];
    
    this.httpServer = new Server(this.handleHttp);
    this.wss = new WebSocketServer({ server: this.httpServer });
  }
  
  handleHttp = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Simple WebSocket Server Running');
  }
  
  broadcastState() {
    const state = {
      tasks: this.tasks,
      concepts: this.concepts,
      logs: this.logs,
      stats: {
        tasks: this.tasks.length,
        concepts: this.concepts.length,
        isRunning: false,
        isPaused: true,
        cycles: 0,
        timestamp: Date.now()
      }
    };
    
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN = 1
        client.send(JSON.stringify({ type: 'state_update', payload: state }));
      }
    });
  }
  
  handleAddTask(payload) {
    const newTask = {
      id: randomUUID(),
      content: payload.content,
      priority: typeof payload.priority === 'number' ? Math.max(0, Math.min(1, payload.priority)) : 0.5,
      status: payload.status || 'Input',
      type: payload.type || 'Input',
      createdAt: Date.now(),
      lastModified: Date.now(),
      dependencies: Array.isArray(payload.dependencies) ? payload.dependencies : [],
      metadata: typeof payload.metadata === 'object' ? payload.metadata : {}
    };
    
    this.tasks.push(newTask);
    this.broadcastState();
    
    return newTask;
  }
  
  handleUpdateTask(payload) {
    const taskIndex = this.tasks.findIndex(task => task.id === payload.id);
    if (taskIndex !== -1) {
      const allowedFields = ['priority', 'status', 'type', 'content', 'dependencies', 'metadata'];
      
      for (const [key, value] of Object.entries(payload)) {
        if (allowedFields.includes(key) && key !== 'id') {
          this.tasks[taskIndex][key] = value;
        }
      }
      this.tasks[taskIndex].lastModified = Date.now();
      
      this.broadcastState();
    }
  }
  
  handleDeleteTask(payload) {
    const taskIndex = this.tasks.findIndex(task => task.id === payload.id);
    if (taskIndex !== -1) {
      this.tasks.splice(taskIndex, 1);
      this.broadcastState();
    }
  }
  
  handleCommand(command, payload) {
    switch (command) {
      case 'add_task':
        return this.handleAddTask(payload);
      case 'update_task':
        this.handleUpdateTask(payload);
        break;
      case 'delete_task':
        this.handleDeleteTask(payload);
        break;
      case 'start':
        // Update state to running
        break;
      case 'stop':
        // Update state to stopped
        break;
      case 'step':
        // Execute single cycle
        break;
      case 'reset':
        // Reset to initial state
        this.tasks = [
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
        this.broadcastState();
        break;
      case 'throttle':
        // Handle throttle
        break;
      default:
        console.log(`Unknown command: ${command}`);
    }
  }
  
  start() {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`Simple WebSocket server listening on port ${this.port}`);
        resolve();
      });

      this.httpServer.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws) => {
        console.log('New client connected');
        this.clients.add(ws);
        
        // Send initial state to new client
        this.broadcastState();
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'control' && message.command) {
              this.handleCommand(message.command, message.payload || {});
            }
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });
        
        ws.on('close', () => {
          console.log('Client disconnected');
          this.clients.delete(ws);
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.clients.delete(ws);
        });
      });
    });
  }
  
  stop() {
    this.clients.forEach(client => client.close());
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('Simple WebSocket server closed');
        resolve();
      });
    });
  }
}

export default SimpleWebSocketServer;

// For running directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new SimpleWebSocketServer(port);

  server.start().then(() => {
    console.log(`Server running on port ${port}`);
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}