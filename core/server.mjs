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
    
    try {
      switch (command) {
        case 'start':
          console.log('Start command received');
          // Update the reasoner state to running
          const startState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...startState,
            isRunning: true,
            isPaused: false,
            timestamp: Date.now()
          });
          break;
        case 'stop':
          console.log('Stop command received');
          // Update the reasoner state to stopped/paused
          const stopState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...stopState,
            isRunning: false,
            isPaused: true,
            timestamp: Date.now()
          });
          break;
        case 'step':
          console.log('Step command received - executing single cognitive cycle');
          // Simulate a cognitive step by updating the cycle count and maintaining current state
          const currentState = awareness.getLocalState()?.reasonerStats || {};
          const newCycleCount = (currentState.cycles || 0) + 1;
          
          // Update awareness with new cycle count and maintain other stats
          awareness.setLocalStateField('reasonerStats', {
            ...currentState,
            cycles: newCycleCount,
            isRunning: false,  // After step execution, remain paused
            isPaused: true,    // Step executed in isolation
            concepts: yConcepts.length,
            tasks: yTasks.length,
            timestamp: Date.now()
          });
          
          console.log(`Cognitive cycle ${newCycleCount} completed`);
          break;
        case 'reset':
          console.log('Reset command received');
          // Reset the system to initial state
          const resetState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            isRunning: false,
            isPaused: true,
            cycles: 0,
            concepts: initialConcepts.length,
            tasks: initialTasks.length,
            timestamp: Date.now()
          });
          
          // Clear all dynamic tasks and concepts, keeping initial ones in the mock version
          yTasks.delete(0, yTasks.length);
          yConcepts.delete(0, yConcepts.length);
          
          // Reinitialize with initial data
          initialTasks.forEach(task => yTasks.push([new Y.Map(Object.entries(task))]));
          initialConcepts.forEach(concept => yConcepts.push([new Y.Map(Object.entries(concept))]));
          break;
        case 'throttle':
          console.log(`Throttle command: ${payload.value}%`);
          // In a real implementation, this would adjust the reasoning cycle speed
          const throttleState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...throttleState,
            timestamp: Date.now()
          });
          break;
        case 'add_task':
          console.log('Add task command received');
          // Validate required fields
          if (!payload.content) {
            console.error('Add task command failed: missing content');
            return;
          }
          
          // Add a new task to the Yjs document
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
        case 'update_task':
          console.log('Update task command received');
          // Update an existing task
          const taskId = payload.id;
          if (!taskId) {
            console.error('Update task command failed: missing task ID');
            return;
          }
          
          const yTasksArr = ydoc.getArray('tasks');
          const taskIndex = yTasksArr.toArray().findIndex(task => task.get('id') === taskId);
          if (taskIndex !== -1) {
            const taskMap = yTasksArr.get(taskIndex);
            // Ensure ID can't be changed and sanitize the update
            const allowedFields = ['priority', 'status', 'type', 'content', 'dependencies', 'missionId', 'metadata'];
            const updatedFields = { lastModified: Date.now() };
            
            for (const [key, value] of Object.entries(payload)) {
              if (allowedFields.includes(key) && key !== 'id') {
                updatedFields[key] = value;
              }
            }
            
            for (const [key, value] of Object.entries(updatedFields)) {
              taskMap.set(key, value);
            }
            
            // Update stats
            const updateTaskState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...updateTaskState,
              timestamp: Date.now()
            });
          } else {
            console.error(`Update task command failed: task with ID ${taskId} not found`);
          }
          break;
        case 'delete_task':
          console.log('Delete task command received');
          // Remove a task from the Yjs document
          const deleteTaskId = payload.id;
          if (!deleteTaskId) {
            console.error('Delete task command failed: missing task ID');
            return;
          }
          
          const yTasksArr2 = ydoc.getArray('tasks');
          const deleteIndex = yTasksArr2.toArray().findIndex(task => task.get('id') === deleteTaskId);
          if (deleteIndex !== -1) {
            yTasksArr2.delete(deleteIndex, 1);
            
            // Update stats
            const deleteTaskState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...deleteTaskState,
              tasks: yTasksArr2.length,
              timestamp: Date.now()
            });
          } else {
            console.error(`Delete task command failed: task with ID ${deleteTaskId} not found`);
          }
          break;

        default:
          console.log(`Unknown command: ${command}`);
          // Send an error response for unknown commands
          break;
      }
    } catch (error) {
      console.error(`Error handling command ${command}:`, error);
      // In a real implementation, we might want to send an error response back to the client
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
