import WebSocketServer from './WebSocketServer.js';
import { WebSocketUtils } from './WebSocketUtils.js';

// Factory function for creating simple WebSocket servers - eliminates need for separate class
const createSimpleServer = (port = 8080) => {
  const server = new WebSocketServer(null, { simpleMode: true, port });

  // Add simple message handling capability
  const originalHandler = server.messageHandler.handle.bind(server.messageHandler);
  server.messageHandler.handle = (clientId, message) => {
    if (server.simpleMode && message.type === 'message') {
      server.handleSimpleMessage(clientId, message);
    } else {
      originalHandler(clientId, message);
    }
  };

  return server;
};

// If running this file directly, start the server
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = createSimpleServer(port);

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