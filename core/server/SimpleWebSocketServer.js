import WebSocketServer from './WebSocketServer.js';
import { WebSocketUtils } from './WebSocketUtils.js';

// Simple WebSocket server wrapper that extends the main WebSocketServer
class SimpleWebSocketServer extends WebSocketServer {
  constructor(port = 8080) {
    super(null); // No core needed for simple server
    this.port = port;
    this.simpleClients = new Set();
  }

  async initialize(config = {}) {
    await super.initialize({ ...config, port: this.port, enabled: true });
  }

  async start() {
    await this.initialize();
    await super.start();
    WebSocketUtils.debug(`Simple WebSocket server started on port ${this.port}`);
  }

  async stop() {
    await super.stop();
    WebSocketUtils.debug('Simple WebSocket server stopped');
  }

  // Simple message handler for basic echo functionality
  handleSimpleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !WebSocketUtils.isValidClient(client)) return;

    try {
      // Echo message back for testing
      this.sendToClient(clientId, {
        type: 'echo',
        payload: message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      WebSocketUtils.error('Error handling simple message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcast(message) {
    super.broadcast(WebSocketUtils.createMessage('broadcast', message));
  }
}

// If running this file directly, start the server
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new SimpleWebSocketServer(port);

  server.start()
    .then(() => {
      console.log(`Simple WebSocket server initialized on port ${port}`);
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

export default SimpleWebSocketServer;