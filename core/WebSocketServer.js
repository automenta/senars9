import { WebSocketServer as WSServer } from 'ws';
import { createServer } from 'http';
import Component from './base/Component.js';
import { Logger } from './base/utilities.js';

class WebSocketServer extends Component {
  constructor() {
    super();
    this.wss = null;
    this.server = null;
    this.clients = new Map(); // Use Map to support .set() and .get() for tests
    this.clientIdCounter = 0;
    this.isRunning = false;
    this.port = 8080;
    this.host = '0.0.0.0';
  }

  getDefaultConfig() {
    return {
      port: 8080,
      host: '0.0.0.0',
      heartbeatInterval: 30000,
      maxConnectionsPerIP: 10,
      maxTotalConnections: 1000,
      maxConnectionRate: 10,
      enabled: true // Default to enabled for backward compatibility
    };
  }

  async _doInitialize(config) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.port = this.config.port || 8080;
    this.host = this.config.host || '0.0.0.0';
    this.heartbeatInterval = this.config.heartbeatInterval || 30000;
    
    // Check if server should be enabled
    this.isEnabled = this.config.enabled !== false;
    
    if (this.isEnabled) {
      this.server = createServer();
      this.wss = new WSServer({ server: this.server });

      // Set up connection handling
      this.wss.on('connection', (ws, request) => this._handleConnection(ws, request));
      this.wss.on('error', (error) => Logger.error('WebSocket server error', error));
    } else {
      Logger.debug('WebSocket server is disabled by configuration');
    }
  }

  async _doStart() {
    // Check if server is disabled by configuration
    if (!this.isEnabled) {
      Logger.debug('WebSocket server start skipped - server is disabled');
      return;
    }

    if (this.isRunning) return;

    // Check if server initialization was successful
    if (!this.server) {
      Logger.warn('WebSocket server not initialized, skipping start');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, (error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = true;
          Logger.debug(`WebSocket server running on ws://${this.host}:${this.port}`);
          resolve();
        }
      });
    });
  }

  async _doStop() {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.ws.close(1000, 'Server shutting down');
      }
      this.clients.clear();

      this.wss.close(() => {
        this.server.close(() => {
          this.isRunning = false;
          Logger.debug('WebSocket server stopped');
          resolve();
        });
      });
    });
  }

  _handleConnection(ws, request) {
    const clientId = `client_${++this.clientIdCounter}`;
    const clientInfo = {
      id: clientId,
      connectedAt: new Date(),
      lastSeen: new Date(),
      ws: ws,
      ip: this._getClientIP(request),
      status: 'connected'
    };

    this.clients.set(clientId, clientInfo);

    // Send initial state to new client
    this._sendInitialState(ws);

    ws.on('message', (data) => {
      this._handleMessage(clientId, data, ws);
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      Logger.debug(`Client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      Logger.error(`WebSocket error for client ${clientId}`, error);
    });

    Logger.debug(`Client connected: ${clientId} from ${clientInfo.ip}`);
  }

  _getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           request.headers['x-real-ip'] ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.connection?.socket?.remoteAddress ||
           'unknown';
  }

  _sendInitialState(ws) {
    // Send initial state to newly connected client
    const initialState = {
      type: 'state_update',
      payload: {
        tasks: [],
        concepts: [],
        logs: [
          { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
          { id: 'log-2', message: 'UI connected to server', timestamp: Date.now() }
        ],
        stats: {
          isRunning: false,
          isPaused: true,
          cycles: 0,
          tasks: 0,
          concepts: 0,
          timestamp: Date.now()
        }
      }
    };

    ws.send(JSON.stringify(initialState));
  }

  _handleMessage(clientId, data, ws) {
    try {
      const message = JSON.parse(data.toString());
      Logger.debug('Received message from client:', clientId, message);

      switch (message.type) {
        case 'control':
          this._handleControlCommand(message.command, message.payload, clientId);
          break;
        case 'request_state':
          this._sendCurrentState(ws);
          break;
        default:
          Logger.debug('Unknown message type:', message.type);
      }
    } catch (error) {
      Logger.error('Error parsing message:', error);
    }
  }

  _handleControlCommand(command, payload, clientId) {
    Logger.debug('Handling control command:', command, payload);

    switch (command) {
      case 'start':
        this.broadcast({
          type: 'system_event',
          event: 'reasoning_started',
          timestamp: Date.now()
        });
        break;

      case 'stop':
        this.broadcast({
          type: 'system_event',
          event: 'reasoning_stopped',
          timestamp: Date.now()
        });
        break;

      case 'step':
        // Simulate a reasoning step
        const newTask = {
          id: `task_${Date.now()}`,
          content: `Simulated task from step ${Math.floor(Math.random() * 1000)}`,
          priority: 0.5 + Math.random() * 0.4,
          status: 'Input',
          type: 'Input',
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        this.broadcast({
          type: 'task_derived',
          data: newTask,
          timestamp: Date.now()
        });
        break;

      case 'reset':
        this.broadcast({
          type: 'system_event',
          event: 'system_reset',
          timestamp: Date.now()
        });
        break;

      case 'add_task':
        if (payload.content) {
          const newTask = {
            id: payload.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: payload.content,
            priority: payload.priority || 0.5,
            status: payload.status || 'Input',
            type: payload.type || 'Input',
            createdAt: Date.now(),
            lastModified: Date.now()
          };

          this.broadcast({
            type: 'task_added',
            data: newTask,
            timestamp: Date.now()
          });
        }
        break;

      case 'get_concepts':
        // Send concept data to requesting client only
        const concepts = [
          { id: 'concept-a', content: 'a', priority: 0.9 },
          { id: 'concept-b', content: 'b', priority: 0.8 },
          { id: 'concept-c', content: 'c', priority: 0.7 }
        ];

        this._sendToClient(clientId, {
          type: 'concepts_update',
          payload: concepts
        });
        break;

      case 'get_top_tasks':
        // Send top tasks to requesting client only
        const topTasks = [
          {
            id: 'task-1',
            content: '(a-->b).',
            priority: 0.9,
            status: 'Input',
            type: 'Input',
            createdAt: Date.now(),
            lastModified: Date.now()
          },
          {
            id: 'task-2',
            content: '(b-->c).',
            priority: 0.8,
            status: 'Input',
            type: 'Input',
            createdAt: Date.now(),
            lastModified: Date.now()
          }
        ];

        this._sendToClient(clientId, {
          type: 'top_tasks_update',
          payload: topTasks
        });
        break;

      default:
        Logger.debug('Unknown command:', command);
    }
  }

  _sendCurrentState(ws) {
    const state = {
      type: 'state_update',
      payload: {
        tasks: [],
        concepts: [],
        logs: [
          { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
          { id: 'log-2', message: 'Current state requested', timestamp: Date.now() }
        ],
        stats: {
          isRunning: false,
          isPaused: true,
          cycles: Math.floor(Math.random() * 100),
          tasks: Math.floor(Math.random() * 10),
          concepts: Math.floor(Math.random() * 5),
          timestamp: Date.now()
        }
      }
    };

    ws.send(JSON.stringify(state));
  }

  _sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to all connected clients - this is the method used by Core.js
   */
  broadcast(message) {
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === 1) { // WebSocket.OPEN
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          Logger.error('Error broadcasting to client:', error);
          // Remove client if connection is broken
          this.clients.delete(clientId);
        }
      }
    }
  }

  getStats() {
    return {
      ...this.getPerformanceStats(),
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      port: this.port,
      connectionsByIP: this._getConnectionsByIP()
    };
  }

  _getConnectionsByIP() {
    const ipCounts = {};
    for (const [clientId, client] of this.clients) {
      ipCounts[client.ip] = (ipCounts[client.ip] || 0) + 1;
    }
    return ipCounts;
  }
}

export default WebSocketServer;
export { WebSocketServer };