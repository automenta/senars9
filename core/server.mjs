import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { setupWSConnection } from '@y/websocket-server/utils';
import { initialTasks, initialConcepts, initialLogs } from '../ui/src/example-data.js';

const doc = new Y.Doc();
const yTasks = doc.getArray('tasks');
const yConcepts = doc.getArray('concepts');
const yLogs = doc.getArray('logs');

// Initialize awareness for sharing real-time stats
const awareness = new Awareness(doc);

class SenarsServer {
  constructor(port = 8080) {
    this.port = port;
    this.httpServer = new Server((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('okay');
    });
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.mockDataInterval = null;
  }

  loadInitialData() {
    console.log('Loading initial data into Y.Doc...');
    initialTasks.forEach(task => yTasks.push([new Y.Map(Object.entries(task))]));
    initialConcepts.forEach(concept => yConcepts.push([new Y.Map(Object.entries(concept))]));
    initialLogs.forEach(log => yLogs.push([new Y.Map(Object.entries(log))]));
    console.log('Initial data loaded.');
  }

  startMockData() {
    // Set initial awareness state with cycle stats
    awareness.setLocalStateField('reasonerStats', {
      isRunning: false,
      isPaused: true,  // Start paused by default
      cycles: 0,
      tasks: initialTasks.length,
      concepts: initialConcepts.length,
      timestamp: Date.now()
    });

    this.mockDataInterval = setInterval(() => {
      const concept = { type: 'concept', data: { id: randomUUID(), content: `Dynamic Concept ${Date.now()}` } };
      yConcepts.push([new Y.Map(Object.entries(concept))]);

      // Update awareness with current stats
      const currentState = awareness.getLocalState()?.reasonerStats || {};
      awareness.setLocalStateField('reasonerStats', {
        ...currentState,
        isRunning: false,  // Default to not running
        isPaused: true,    // Default to paused
        concepts: yConcepts.length,
        tasks: yTasks.length,
        timestamp: Date.now()
      });
    }, 5000);
  }

  async handleControlCommand(command, payload) {
    console.log(`Received command: ${command}`, payload);
    
    switch (command) {
      case 'start':
        console.log('Start command received - not implemented in simple server');
        break;
      case 'stop':
        console.log('Stop command received - not implemented in simple server');
        break;
      case 'step':
        console.log('Step command received - not implemented in simple server');
        // This would trigger a single cognitive cycle in a full implementation
        // For now, just update the cycle count to simulate a step
        const currentState = awareness.getLocalState()?.reasonerStats || {};
        const newCycleCount = (currentState.cycles || 0) + 1;
        
        awareness.setLocalStateField('reasonerStats', {
          ...currentState,
          cycles: newCycleCount,
          timestamp: Date.now()
        });
        break;
      case 'reset':
        // Reset the cycle count
        const resetState = awareness.getLocalState()?.reasonerStats || {};
        awareness.setLocalStateField('reasonerStats', {
          ...resetState,
          cycles: 0,
          timestamp: Date.now()
        });
        break;
      case 'throttle':
        console.log(`Throttle command: ${payload.value}%`);
        break;
      case 'add_task':
        // Add a new task to the Yjs document
        const newTask = {
          id: randomUUID(),
          content: payload.content || 'User task',
          priority: payload.priority || 0.5,
          status: 'Input',
          type: 'Input',
          createdAt: Date.now()
        };
        const taskMap = new Y.Map();
        Object.entries(newTask).forEach(([key, value]) => {
          taskMap.set(key, value);
        });
        yTasks.push([taskMap]);
        
        // Update stats
        const addTaskState = awareness.getLocalState()?.reasonerStats || {};
        awareness.setLocalStateField('reasonerStats', {
          ...addTaskState,
          tasks: yTasks.length,
          timestamp: Date.now()
        });
        break;
      default:
        console.log(`Unknown command: ${command}`);
    }
  }

  start() {
    this.loadInitialData();

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`SeNARS server listening on port ${this.port} (0.0.0.0)`);
        resolve();
      });

      this.httpServer.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws, req) => {
        setupWSConnection(ws, req, { doc, awareness });
        console.log('New client connected and attached to Y.Doc with awareness');

        // Handle messages for command control
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'control' && message.command) {
              await this.handleControlCommand(message.command, message.payload || {});
            } else if (message.type === 'command') {
              // Handle legacy command format
              const command = message.payload?.data;
              if (command) {
                await this.handleControlCommand(command, {});
              }
            }
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });
      });

      this.startMockData();
    });
  }

  stop() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('SeNARS server closed');
        resolve();
      });
    });
  }
}

async function main() {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new SenarsServer(port);

  try {
    await server.start();
    console.log(`Server initialized on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log('Received shutdown signal, shutting down gracefully');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default SenarsServer;
