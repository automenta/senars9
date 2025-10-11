import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import TwoPhaseSet from '../ui/src/utils/crdt.js';

// WebSocket server for SeNARS with CRDT-based "Bagregate"
class SenarsServer {
  constructor(port = 8080) {
    this.port = port;
    this.httpServer = new Server();
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.clients = new Set();
    this.bagregate = new TwoPhaseSet(); // The CRDT Bagregate for tasks/activity
    this.mockDataInterval = null;
  }

  start() {
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
        console.log('New client connected');
        this.clients.add(ws);

        // Send the initial state of the Bagregate to the new client
        ws.send(JSON.stringify({
          type: 'bagregate-init',
          payload: this.bagregate.toJSON(),
        }));

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
      });

      this.mockDataInterval = setInterval(() => {
        this.broadcast(JSON.stringify({
            type: 'concept',
            payload: { id: randomUUID(), content: `Concept ${Date.now()}` }
        }));
        this.broadcast(JSON.stringify({
            type: 'reasoner_stats',
            payload: { cycles: Math.floor(Math.random() * 1000) }
        }));
      }, 5000);
    });
  }

  handleMessage(message) {
    try {
      const { type, payload } = JSON.parse(message);
      console.log('Received command:', type, payload);

      switch (type) {
        case 'task-create': {
          const newTask = { id: randomUUID(), ...payload };
          this.bagregate.add(newTask);
          this.broadcastBagregateUpdate();
          break;
        }

        case 'task-delete': {
          const taskId = payload.id;
          const taskToRemove = this.bagregate.values.find(task => task.id === taskId);
          if (taskToRemove) {
            this.bagregate.remove(taskToRemove);
            this.broadcastBagregateUpdate();
          }
          break;
        }

        case 'task-update-priority': {
          const { id, priority } = payload;
          const taskToUpdate = this.bagregate.values.find(task => task.id === id);
          if (taskToUpdate) {
            // CRDT 'update' is a remove and an add
            this.bagregate.remove(taskToUpdate);
            const updatedTask = { ...taskToUpdate, priority };
            this.bagregate.add(updatedTask);
            this.broadcastBagregateUpdate();
          }
          break;
        }

        case 'command': {
          console.log('Received command:', payload);
          this.broadcast(JSON.stringify({
            type: 'log',
            payload: { message: `Command received: ${payload.data}` }
          }));
          break;
        }

        default:
          console.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
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

export default SenarsServer;

// If running this file directly, start the server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new SenarsServer(port);

  server.start()
    .then(() => {
      console.log(`Server initialized on port ${port}`);
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });

  // Handle process termination gracefully
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
}
