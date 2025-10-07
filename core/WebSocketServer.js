import { WebSocketServer as WSServer } from 'ws';
import { createServer } from 'http';
import Component from './Component.js';

class WebSocketServer extends Component {
  constructor() {
    super();
    this.wss = null;
    this.server = null;
    this.clients = new Map();
    this.heartbeatInterval = null;
    this.isRunning = false;

    this.narsInstances = new Map();
    this.subscriptions = new Map();
    this.taskStreams = new Map();
  }

  async initialize(config = {}) {
    await super.initialize(config);

    const port = config.port || 8080;
    const host = config.host || 'localhost';
    const heartbeatInterval = config.heartbeatInterval || 30000;

    this.server = createServer();
    this.wss = new WSServer({ server: this.server });

    this.wss.on('connection', (ws, request) => {
      this._handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    this.heartbeatInterval = heartbeatInterval;
  }

  async start() {
    if (this.isRunning) return;

    const port = this.config.port || 8080;
    const host = this.config.host || 'localhost';

    return new Promise((resolve, reject) => {
      this.server.listen(port, host, (error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = true;
          this._startHeartbeat();
          console.log(`WebSocket server running on ws://${host}:${port}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    if (!this.isRunning) return;

    this._stopHeartbeat();

    return new Promise((resolve) => {
      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.ws.close(1000, 'Server shutting down');
      }
      this.clients.clear();

      this.wss.close(() => {
        this.server.close(() => {
          this.isRunning = false;
          console.log('WebSocket server stopped');
          resolve();
        });
      });
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) { // OPEN
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message, excludeClients = []) {
    const excludeSet = new Set(excludeClients);

    for (const [clientId, client] of this.clients) {
      if (!excludeSet.has(clientId) && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  sendToClientType(clientType, message) {
    for (const [clientId, client] of this.clients) {
      if (client.type === clientType && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  _handleConnection(ws, request) {
    const clientId = this._generateClientId();
    const clientInfo = {
      id: clientId,
      type: 'unknown',
      connectedAt: new Date(),
      lastSeen: new Date(),
      ws: ws
    };

    this.clients.set(clientId, clientInfo);

    ws.on('message', (data) => {
      this._handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this._handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this._handleDisconnection(clientId);
    });

    // Send welcome message with client ID
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId: clientId,
      timestamp: new Date().toISOString()
    });

    console.log(`Client connected: ${clientId}`);
  }

  _handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = new Date();

    try {
      const message = JSON.parse(data.toString());

      // Handle protocol messages
      if (message.type === 'identify') {
        this._handleIdentify(clientId, message);
      } else if (message.type === 'heartbeat') {
        // Heartbeat response
        return;
      } else if (message.type === 'subscribe') {
        this._handleSubscription(clientId, message);
      } else if (message.type === 'unsubscribe') {
        this._handleUnsubscription(clientId, message);
      } else if (message.type === 'nars_message') {
        // Enhanced inter-NARS protocol message
        this._handleNARSMessage(clientId, message);
      } else if (message.type === 'task_stream') {
        // Real-time task streaming
        this._handleTaskStream(clientId, message);
      } else {
        // Emit custom message event
        this.emit('message', {
          clientId,
          clientType: client.type,
          message,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
    }
  }

  _handleIdentify(clientId, message) {
     const client = this.clients.get(clientId);
     if (!client) return;

     client.type = message.clientType || 'unknown';
     client.version = message.version || 'unknown';
     client.capabilities = message.capabilities || [];

     // Register NARS instances for inter-NARS communication
     if (client.type === 'nars') {
       this.narsInstances.set(clientId, {
         ...client,
         instanceId: message.instanceId || clientId,
         registeredAt: new Date()
       });
     }

     console.log(`Client ${clientId} identified as: ${client.type} (v${client.version})`);
   }

  _handleSubscription(clientId, message) {
     const { eventTypes = [], filters = {} } = message;

     if (!this.subscriptions.has(clientId)) {
       this.subscriptions.set(clientId, {
         eventTypes: new Set(),
         filters: {},
         subscribedAt: new Date()
       });
     }

     const subscription = this.subscriptions.get(clientId);
     eventTypes.forEach(eventType => subscription.eventTypes.add(eventType));
     subscription.filters = { ...subscription.filters, ...filters };
     subscription.lastUpdated = new Date();

     this.sendToClient(clientId, {
       type: 'subscription_confirmed',
       eventTypes: Array.from(subscription.eventTypes),
       timestamp: new Date().toISOString()
     });
   }

  _handleUnsubscription(clientId, message) {
     const { eventTypes = [] } = message;

     if (this.subscriptions.has(clientId)) {
       const subscription = this.subscriptions.get(clientId);

       if (eventTypes.length === 0) {
         // Unsubscribe from all events
         this.subscriptions.delete(clientId);
       } else {
         // Unsubscribe from specific events
         eventTypes.forEach(eventType => subscription.eventTypes.delete(eventType));
         if (subscription.eventTypes.size === 0) {
           this.subscriptions.delete(clientId);
         }
       }
     }
   }

  _handleTaskStream(clientId, message) {
     const { taskId, action, data } = message;

     if (!this.taskStreams.has(taskId)) {
       this.taskStreams.set(taskId, {
         id: taskId,
         participants: new Set(),
         history: [],
         createdAt: new Date()
       });
     }

     const stream = this.taskStreams.get(taskId);
     stream.participants.add(clientId);
     stream.history.push({
       clientId,
       action,
       data,
       timestamp: new Date()
     });

     // Broadcast task updates to other participants
     this.broadcast({
       type: 'task_update',
       taskId,
       source: clientId,
       action,
       data,
       timestamp: new Date().toISOString()
     }, [clientId]);
   }

  _handleNARSMessage(clientId, message) {
     const client = this.clients.get(clientId);
     if (!client) return;

     const { target, data, protocol = 'standard' } = message;

     // Enhanced NARS protocol with routing
     const narsMessage = {
       type: 'nars_message',
       protocol,
       source: clientId,
       sourceInstance: client.type === 'nars' ? this.narsInstances.get(clientId)?.instanceId : null,
       target,
       data,
       timestamp: new Date().toISOString()
     };

     if (target === 'all') {
       // Broadcast to all NARS instances
       this.sendToClientType('nars', narsMessage);
     } else if (target && this.narsInstances.has(target)) {
       // Send to specific NARS instance
       this.sendToClient(target, narsMessage);
     } else {
       // Broadcast to all other NARS instances (default behavior)
       this.sendToClientType('nars', narsMessage, [clientId]);
     }
   }

  _handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`Client disconnected: ${clientId} (${client.type})`);
      this.clients.delete(clientId);
    }
  }

  _generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = this.heartbeatInterval * 2; // 2x heartbeat interval

      // Check for dead connections
      for (const [clientId, client] of this.clients) {
        if (now - client.lastSeen > timeout) {
          console.log(`Client ${clientId} timed out`);
          client.ws.close(1000, 'Heartbeat timeout');
          this.clients.delete(clientId);
        } else {
          // Send heartbeat ping
          this.sendToClient(clientId, {
            type: 'heartbeat',
            timestamp: now.toISOString()
          });
        }
      }
    }, this.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  publishEvent(eventType, data, filters = {}) {
    const eventMessage = {
      type: 'event',
      eventType,
      data,
      filters,
      timestamp: new Date().toISOString()
    };

    // Send to subscribed clients
    for (const [clientId, subscription] of this.subscriptions) {
      if (subscription.eventTypes.has(eventType) || subscription.eventTypes.has('*')) {
        // Check if client filters match event filters
        const matchesFilters = this._checkEventFilters(subscription.filters, filters);
        if (matchesFilters && this.clients.has(clientId)) {
          this.sendToClient(clientId, eventMessage);
        }
      }
    }
  }

  _checkEventFilters(subscriptionFilters, eventFilters) {
    for (const [key, value] of Object.entries(subscriptionFilters)) {
      if (eventFilters[key] !== value) {
        return false;
      }
    }
    return true;
  }

  getNARSInstances() {
    return Array.from(this.narsInstances.values()).map(instance => ({
      id: instance.id,
      instanceId: instance.instanceId,
      type: instance.type,
      version: instance.version,
      connectedAt: instance.connectedAt
    }));
  }

  sendTaskToNARS(targetInstanceId, task) {
    // Find the client ID for the target instance
    for (const [clientId, instance] of this.narsInstances) {
      if (instance.instanceId === targetInstanceId) {
        this.sendToClient(clientId, {
          type: 'nars_task',
          task,
          timestamp: new Date().toISOString()
        });
        return true;
      }
    }
    return false;
  }

  getStats() {
    const clientTypes = {};
    for (const client of this.clients.values()) {
      clientTypes[client.type] = (clientTypes[client.type] || 0) + 1;
    }

    const subscriptionStats = {};
    for (const [clientId, subscription] of this.subscriptions) {
      Array.from(subscription.eventTypes).forEach(eventType => {
        subscriptionStats[eventType] = (subscriptionStats[eventType] || 0) + 1;
      });
    }

    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      clientsByType: clientTypes,
      narsInstances: this.narsInstances.size,
      subscriptions: this.subscriptions.size,
      subscriptionStats,
      taskStreams: this.taskStreams.size,
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0
    };
  }
}

export default WebSocketServer;