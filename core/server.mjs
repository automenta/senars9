import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import TwoPhaseSet from '../ui/src/utils/crdt.js';
import { initialTasks, initialConcepts, initialLogs } from '../ui/src/example-data.js';

class SenarsServer {
  constructor(port = 8080) {
    this.port = port;
    this.httpServer = new Server();
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.clients = new Set();
    this.bagregate = new TwoPhaseSet();
    this.concepts = [];
    this.logs = [];
    this.mockDataInterval = null;
  }

  loadInitialData() {
    console.log('Loading initial data...');
    initialTasks.forEach(task => this.bagregate.add(task));
    this.concepts = [...initialConcepts];
    this.logs = [...initialLogs];
    console.log('Initial data loaded.');
  }

  startMockData() {
    this.mockDataInterval = setInterval(() => {
      this.broadcast(JSON.stringify({
        type: 'concept',
        payload: { id: randomUUID(), content: `Dynamic Concept ${Date.now()}` }
      }));
      this.broadcast(JSON.stringify({
        type: 'reasoner_stats',
        payload: { cycles: Math.floor(Math.random() * 1000) }
      }));
    }, 5000);
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

      this.wss.on('connection', (ws) => {
        this.handleNewConnection(ws);
      });

      this.startMockData();
    });
  }

  handleNewConnection(ws) {
    console.log('New client connected');
    this.clients.add(ws);

    // Send the initial state to the new client
    ws.send(JSON.stringify({ type: 'bagregate-init', payload: this.bagregate.toJSON() }));
    ws.send(JSON.stringify({ type: 'concepts-init', payload: this.concepts }));
    ws.send(JSON.stringify({ type: 'logs-init', payload: this.logs }));


    ws.on('message', (message) => {
      this.handleMessage(message);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  handleMessage(message) {
    try {
      const { type, payload } = JSON.parse(message);
      console.log('Received message:', type, payload);

      switch (type) {
        case 'task-create':
          this.handleTaskCreate(payload);
          break;
        case 'task-delete':
          this.handleTaskDelete(payload);
          break;
        case 'task-update-priority':
          this.handleTaskUpdatePriority(payload);
          break;
        case 'command':
          this.handleCommand(payload);
          break;
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  handleTaskCreate(payload) {
    const newTask = { id: randomUUID(), ...payload };
    this.bagregate.add(newTask);
    this.broadcastBagregateUpdate();
  }

  handleTaskDelete(payload) {
    const taskId = payload.id;
    const taskToRemove = this.bagregate.values.find(task => task.id === taskId);
    if (taskToRemove) {
      this.bagregate.remove(taskToRemove);
      this.broadcastBagregateUpdate();
    }
  }

  handleTaskUpdatePriority(payload) {
    const { id, priority } = payload;
    const taskToUpdate = this.bagregate.values.find(task => task.id === id);
    if (taskToUpdate) {
      this.bagregate.remove(taskToUpdate);
      const updatedTask = { ...taskToUpdate, priority };
      this.bagregate.add(updatedTask);
      this.broadcastBagregateUpdate();
    }
  }

  handleCommand(payload) {
    console.log('Received command:', payload);
    const newLog = { id: randomUUID(), message: `Command received: ${payload.data}` };
    this.logs.push(newLog);
    this.broadcast(JSON.stringify({ type: 'log', payload: newLog }));
  }

  stop() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('SeNARS server closed');
        resolve();
      });
    });
  }

  broadcast(message) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastBagregateUpdate() {
    const message = JSON.stringify({
      type: 'bagregate-update',
      payload: this.bagregate.toJSON(),
    });
    this.broadcast(message);
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
