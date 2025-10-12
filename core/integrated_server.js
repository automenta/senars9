import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import * as Y from 'yjs';
import { setupWSConnection } from '@y/websocket-server/utils';
import createCore from './orchestration/createCore.js';
import { Task } from './Task.js';
import { Term } from './Term.js';

class IntegratedSenarsServer {
  constructor(port = 8080) {
    this.port = port;
    this.httpServer = new Server((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('SeNARS server running');
    });
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.core = null;
    this.doc = new Y.Doc();
    this.awareness = new Y.Awareness(this.doc);
    this.yTasks = this.doc.getArray('tasks');
    this.yConcepts = this.doc.getArray('concepts');
    this.yLogs = this.doc.getArray('logs');
    this.heartbeatInterval = null;
    this.mockDataInterval = null;
    this.systemRunning = false;
  }

  async initialize() {
    // Create the core system
    this.core = await createCore();
    await this.core.initialize();

    // Set initial awareness state with cycle stats
    this.updateAwarenessStats({
      isRunning: false,
      isPaused: true,  // Start paused by default
      cycles: 0,
      tasks: 0,
      concepts: 0,
      timestamp: Date.now()
    });

    // Listen for core events to update awareness
    if (this.core.messages) {
      this.core.messages.on('cycle.stats', (data) => {
        this.updateAwarenessStats({
          ...this.getAwarenessStats() || {},
          ...data
        });
      });

      this.core.messages.on('task.added', (task) => {
        // Add task to Yjs array
        const taskMap = new Y.Map();
        Object.entries(task).forEach(([key, value]) => {
          taskMap.set(key, value);
        });
        this.yTasks.push([taskMap]);
        
        // Update stats
        this.updateAwarenessStats({
          ...this.getAwarenessStats(),
          tasks: this.yTasks.length,
          timestamp: Date.now()
        });
      });
    }
  }

  updateAwarenessStats(stats) {
    const currentState = this.awareness.getLocalState()?.reasonerStats || {};
    this.awareness.setLocalStateField('reasonerStats', {
      ...currentState,
      ...stats
    });
  }

  getAwarenessStats() {
    return this.awareness.getLocalState()?.reasonerStats;
  }

  startMockData() {
    this.mockDataInterval = setInterval(() => {
      // Update awareness with current stats
      const currentState = this.awareness.getLocalState()?.reasonerStats || {};
      this.updateAwarenessStats({
        ...currentState,
        concepts: this.yConcepts.length,
        tasks: this.yTasks.length,
        timestamp: Date.now()
      });
    }, 2000);
  }

  async start() {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`Integrated SeNARS server listening on port ${this.port} (0.0.0.0)`);
        resolve();
      });

      this.httpServer.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws, req) => {
        // Setup Yjs WebSocket connection with awareness
        setupWSConnection(ws, req, { doc: this.doc, awareness: this.awareness });

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

  async handleControlCommand(command, payload) {
    if (!this.core) {
      console.error('Core system not initialized');
      return;
    }

    try {
      switch (command) {
        case 'start':
          await this.core.cycle.start();
          this.updateAwarenessStats({
            isRunning: true,
            isPaused: false,
            timestamp: Date.now()
          });
          break;
        case 'stop':
          await this.core.cycle.stop();
          this.updateAwarenessStats({
            isRunning: false,
            isPaused: true,
            timestamp: Date.now()
          });
          break;
        case 'pause':
          await this.core.cycle.pause();
          this.updateAwarenessStats({
            isPaused: true,
            timestamp: Date.now()
          });
          break;
        case 'resume':
          await this.core.cycle.resume();
          this.updateAwarenessStats({
            isPaused: false,
            timestamp: Date.now()
          });
          break;
        case 'step':
          await this.core.cycle.step();
          // The cycle will emit stats automatically which will update awareness
          break;
        case 'reset':
          await this.core.cycle.reset();
          // Update stats after reset
          this.updateAwarenessStats({
            cycles: this.core.cycle.cycleCount,
            timestamp: Date.now()
          });
          break;
        case 'throttle':
          // Handle CPU throttle if needed
          console.log(`Throttle requested: ${payload.value}%`);
          break;
        default:
          console.warn(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
    }
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('Integrated SeNARS server closed');
        resolve();
      });
    });
  }
}

// If running this file directly, start the server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new IntegratedSenarsServer(port);

  server.start()
    .then(() => {
      console.log(`Integrated server initialized on port ${port}`);
    })
    .catch((error) => {
      console.error('Failed to start integrated server:', error);
      process.exit(1);
    });

  const shutdown = async () => {
    console.log('Received shutdown signal, shutting down gracefully');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default IntegratedSenarsServer;