import { WebSocketServer as WSServer } from 'ws';
import { createServer } from 'http';
import Component from '../base/Component.js';
import { WebSocketUtils, DEFAULTS } from './WebSocketUtils.js';
import MessageFactory from './MessageFactory.js';
import MessageHandler from './MessageHandler.js';
import ConnectionManager from './ConnectionManager.js';
import StreamManager from './StreamManager.js';

class WebSocketServer extends Component {
  constructor(core, options = {}) {
    super();
    this.core = core;
    this.wss = null;
    this.server = null;
    this.isRunning = false;
    this.startTime = null;
    this.simpleMode = options.simpleMode || false;

    // Initialize core data structures
    this.clients = new Map();
    this.subscriptions = new Map();

    // Initialize component managers
    this.connectionManager = new ConnectionManager(this);
    this.streamManager = new StreamManager(this);
    this.messageHandler = new MessageHandler(this);
  }

  async initialize(config = {}) {
    await super.initialize(config);

    const port = WebSocketUtils.getConfigValue(config, 'port', DEFAULTS.PORT);
    const host = WebSocketUtils.getConfigValue(config, 'host', DEFAULTS.HOST);
    const enabled = WebSocketUtils.getConfigValue(config, 'enabled', DEFAULTS.ENABLED);

    this.server = createServer();
    this.wss = new WSServer({ server: this.server });

    this.wss.on('connection', (ws, request) => this._handleConnection(ws, request));
    this.wss.on('error', (error) => WebSocketUtils.handleError('WebSocket server', error));

    this.connectionManager.initialize(config);
  }

  async start() {
    if (this.isRunning) return;

    if (!this.server) {
      WebSocketUtils.warn('WebSocket server not initialized, skipping start');
      return;
    }

    const port = this.getConfig('port', DEFAULTS.PORT);
     const host = this.getConfig('host', DEFAULTS.HOST);

     const isTestEnvironment = typeof process !== 'undefined' &&
                             (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);

     const enabled = this.getConfig('enabled', DEFAULTS.ENABLED) ?? !isTestEnvironment;

    if (!enabled) {
      WebSocketUtils.debug('WebSocket server is disabled, skipping start');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.listen(port, host, (error) => {
        if (error) {
          WebSocketUtils.handleError(`starting WebSocket server on ${host}:${port}`, error);
          reject(error);
        } else {
          this.isRunning = true;
          this.startTime = Date.now();
          this.connectionManager.startHeartbeat();
          WebSocketUtils.debug(`WebSocket server running on ws://${host}:${port}`);
          resolve();
        }
      });
    });
  }

  _extractSystemState() {
    return WebSocketUtils.extractSystemState(this.core);
  }

  // Standardized configuration access
  getConfig(key, defaultValue = null) {
    return WebSocketUtils.getConfigValue(this.config, key, defaultValue);
  }

  broadcastCurrentState() {
    if (!this.core?.memory) {
      WebSocketUtils.warn('No core memory available for state broadcasting');
      return;
    }

    try {
      const state = WebSocketUtils.extractSystemState(this.core);
      WebSocketUtils.addSystemStatsToState(this.core, state);
      this.broadcast(MessageFactory.createStateUpdateMessage(state));
    } catch (error) {
      WebSocketUtils.handleError('broadcasting current state', error);
    }
  }

  async stop() {
    if (!this.isRunning) return;

    this.connectionManager.stopHeartbeat();

    return new Promise((resolve) => {
      try {
        for (const [clientId, client] of this.clients) {
          client.ws?.close(1000, 'Server shutting down');
        }
        this.clients.clear();

        this.wss.close(() => {
          this.server.close(() => {
            this.isRunning = false;
            this.cleanup();
            WebSocketUtils.debug('WebSocket server stopped');
            resolve();
          });
        });
      } catch (error) {
        WebSocketUtils.error('Error during server shutdown:', error);
        resolve(); // Don't block shutdown on errors
      }
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (WebSocketUtils.isValidClient(client)) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        WebSocketUtils.handleError('sending message', error, clientId);
      }
    }
  }

  broadcast(message, excludeClients = []) {
    if (this.simpleMode && typeof message !== 'object') {
      // In simple mode, wrap primitive messages
      message = MessageFactory.createSystemMessage('broadcast', message);
    }

    const excludeSet = new Set(excludeClients);

    for (const [clientId, client] of this.clients) {
      if (!excludeSet.has(clientId) && WebSocketUtils.isValidClient(client)) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          WebSocketUtils.handleError('broadcasting', error, clientId);
        }
      }
    }
  }

  // Simple mode message handler for basic echo functionality
  handleSimpleMessage(clientId, message) {
    if (!this.simpleMode) return;

    const client = this.clients.get(clientId);
    if (!client || !WebSocketUtils.isValidClient(client)) return;

    try {
      // Echo message back for testing
      this.sendToClient(clientId, MessageFactory.createResponse('echo', message));
    } catch (error) {
      WebSocketUtils.handleError('handling simple message', error, clientId);
      this.sendToClient(clientId, MessageFactory.createErrorResponse('echo', error));
    }
  }

  sendToClientType(clientType, message) {
    for (const [clientId, client] of this.clients) {
      if (client.type === clientType && WebSocketUtils.isValidClient(client)) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          WebSocketUtils.handleError(`sending to client type ${clientType}`, error, clientId);
        }
      }
    }
  }

  _handleConnection(ws, request) {
    const clientId = this.connectionManager.handleConnection(ws, request);

    if (!clientId) return; // Connection was rejected

    this.connectionManager.sendWelcomeMessage(clientId);
    this.connectionManager.sendCurrentState(clientId);
  }

  // Delegation methods
   subscribeToTaskStream(clientId, taskId) {
     return this.streamManager.subscribeToTaskStream(clientId, taskId);
   }

   publishTaskUpdate(taskId, updateData) {
     return this.streamManager.publishTaskUpdate(taskId, updateData);
   }

   publishEvent(eventType, data, filters = {}) {
     return this.streamManager.publishEvent(eventType, data, filters);
   }

  cleanup() {
    this.connectionManager.cleanup();
    this.streamManager.cleanup();
    if (this.simpleMode) {
      this.simpleClients.clear();
    }
  }

  // Factory method to create a simple WebSocket server
  static createSimpleServer(port = 8080) {
    return new WebSocketServer(null, { simpleMode: true, port });
  }

  // Backward compatibility methods
  getNARSInstances() {
    return [];
  }

  broadcastTaskToNARS(task) {
    this.broadcast(MessageFactory.createSystemMessage('nars_task', task));
    return 1;
  }

  getNARSInstanceStatus(instanceId) {
    return null;
  }

  sendRequestToNARS(targetInstanceId, request, timeout = 5000) {
    return Promise.resolve({ success: false, error: 'Not supported in 1:1 architecture' });
  }

  getStats() {
    const connectionStats = this.connectionManager.getStats();
    const streamStats = this.streamManager.getStats();

    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0,
      subscriptions: this.subscriptions.size,
      taskStreams: this.streamManager.taskStreams.size,
      ...connectionStats,
      ...streamStats
    };
  }

}

export default WebSocketServer;