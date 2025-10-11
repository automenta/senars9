import ws from 'ws';
import { Server } from 'http';

const WebSocket = ws;

// Simple WebSocket server for SeNARS
class SenarsServer {
  constructor(port = 8080) {
    this.port = port;
    this.httpServer = new Server();
    this.wss = new WebSocket.Server({ server: this.httpServer });
    this.clients = new Set();
  }

  start() {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, () => {
        console.log(`SeNARS server listening on port ${this.port}`);
        resolve();
      });

      this.httpServer.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws) => {
        console.log('New client connected');
        this.clients.add(ws);

        // Send initial connection confirmation
        ws.send(JSON.stringify({
          type: 'connection',
          data: { status: 'connected', timestamp: Date.now() }
        }));

        ws.on('message', (message) => {
          try {
            const parsedMessage = JSON.parse(message);
            console.log('Received message:', parsedMessage);

            // Echo the message back to the client (for testing)
            // In a real implementation, this would process the command
            ws.send(JSON.stringify({
              type: 'echo',
              data: parsedMessage
            }));
          } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message format' }
            }));
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
    // Close all client connections
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    // Close the server
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('SeNARS server closed');
        resolve();
      });
    });
  }

  broadcast(message) {
    // Send message to all connected clients
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

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
} else {
  export default SenarsServer;
}