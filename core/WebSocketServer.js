import { WebSocketServer as WSServer } from 'ws';
import { createServer } from 'http';
import Component from './base/Component.js';
import { WebSocketUtils, DEFAULTS } from './WebSocketUtils.js';
import MessageHandler from './MessageHandler.js';
import ConnectionManager from './ConnectionManager.js';
import StreamManager from './StreamManager.js';

class WebSocketServer extends Component {
  constructor(core) {
    super();
    this.core = core;
    this.wss = null;
    this.server = null;
    this.clients = new Map();
    this.subscriptions = new Map();
    this.isRunning = false;

    // Initialize component managers
    this.connectionManager = new ConnectionManager(this);
    this.streamManager = new StreamManager(this);
    this.messageHandler = new MessageHandler(this);
  }

  async initialize(config = {}) {
    await super.initialize(config);

    const port = config.port || DEFAULTS.PORT;
    const host = config.host || DEFAULTS.HOST;

    this.server = createServer();
    this.wss = new WSServer({ server: this.server });

    this.wss.on('connection', (ws, request) => this._handleConnection(ws, request));
    this.wss.on('error', (error) => WebSocketUtils.error('WebSocket server error', error));

    this.connectionManager.initialize(config);
  }

  async start() {
    if (this.isRunning) return;

    if (!this.server) {
      WebSocketUtils.warn('WebSocket server not initialized, skipping start');
      return;
    }

    const port = this.config?.port || DEFAULTS.PORT;
    const host = this.config?.host || DEFAULTS.HOST;

    const isTestEnvironment = typeof process !== 'undefined' &&
                             (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);

    const enabled = this.config?.enabled ?? !isTestEnvironment;

    if (!enabled) {
      WebSocketUtils.debug('WebSocket server is disabled, skipping start');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.listen(port, host, (error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = true;
          this.connectionManager.startHeartbeat();
          WebSocketUtils.debug(`WebSocket server running on ws://${host}:${port} for Core`);
          resolve();
        }
      });
    });
  }

  // Extract current system state into standardized format
  _extractSystemState() {
    return WebSocketUtils.extractSystemState(this.core);
  }

  // Broadcast full current state to all clients
  broadcastCurrentState() {
    if (!this.core?.memory) {
      WebSocketUtils.warn('No core memory available for state broadcasting');
      return;
    }

    try {
      const state = WebSocketUtils.extractSystemState(this.core);
      WebSocketUtils.addSystemStatsToState(this.core, state);

      this.broadcast(WebSocketUtils.createMessage('complete_state', state));
    } catch (error) {
      WebSocketUtils.error('Error broadcasting current state', error);
    }
  }

  async stop() {
    if (!this.isRunning) return;

    this.connectionManager.stopHeartbeat();

    return new Promise((resolve) => {
      for (const [clientId, client] of this.clients) {
        client.ws.close(1000, 'Server shutting down');
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
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (WebSocketUtils.isValidClient(client)) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, excludeClients = []) {
    const excludeSet = new Set(excludeClients);

    for (const [clientId, client] of this.clients) {
      if (!excludeSet.has(clientId) && WebSocketUtils.isValidClient(client)) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  sendToClientType(clientType, message) {
    for (const [clientId, client] of this.clients) {
      if (client.type === clientType && WebSocketUtils.isValidClient(client)) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  _handleConnection(ws, request) {
    const clientId = this.connectionManager.handleConnection(ws, request);

    if (!clientId) return; // Connection was rejected

    this.connectionManager.sendWelcomeMessage(clientId);
    this.connectionManager.sendCurrentState(clientId);
  }

  // Component delegation methods
  subscribeToTaskStream(clientId, taskId) {
    return this.streamManager.subscribeToTaskStream(clientId, taskId);
  }

  publishTaskUpdate(taskId, updateData) {
    return this.streamManager.publishTaskUpdate(taskId, updateData);
  }

  publishEvent(eventType, data, filters = {}) {
    return this.streamManager.publishEvent(eventType, data, filters);
  }

  createTaskStream(taskId, options = {}) {
    return this.streamManager.createTaskStream(taskId, options);
  }

  cleanup() {
    this.connectionManager.cleanup();
    this.streamManager.cleanup();
  }

  // DEPRECATED: Backward compatibility methods for existing tests and demos
  getNARSInstances() {
    return [];
  }

  broadcastTaskToNARS(task) {
    this.broadcast({
      type: 'nars_task',
      task,
      timestamp: new Date().toISOString()
    });
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
      ...connectionStats,
      ...streamStats,
      subscriptions: this.subscriptions.size,
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0
    };
  }

}

export default WebSocketServer;