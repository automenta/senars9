import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import * as Y from 'yjs';
import { setupWSConnection } from '@y/websocket-server/utils';
import { initialTasks, initialConcepts, initialLogs } from '../ui/src/example-data.js';

const doc = new Y.Doc();
const yTasks = doc.getArray('tasks');
const yConcepts = doc.getArray('concepts');
const yLogs = doc.getArray('logs');

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
    this.mockDataInterval = setInterval(() => {
      const concept = { type: 'concept', data: { id: randomUUID(), content: `Dynamic Concept ${Date.now()}` } };
      yConcepts.push([new Y.Map(Object.entries(concept))]);

      // Note: reasoner_stats are handled by awareness in the new setup,
      // so we won't broadcast them this way anymore.
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

      this.wss.on('connection', (ws, req) => {
        setupWSConnection(ws, req, { doc });
        console.log('New client connected and attached to Y.Doc');
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
