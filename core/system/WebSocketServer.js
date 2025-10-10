import { WebSocketServer as WSServer } from 'ws';
import { createServer } from 'http';
import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';

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
      Logger.error('WebSocket server error', error);
    });

    this.heartbeatInterval = heartbeatInterval;
  }

  async start() {
    if (this.isRunning) return;
    
    // Check if server initialization was successful
    if (!this.server) {
      Logger.warn('WebSocket server not initialized, skipping start');
      return;
    }

    const port = this.config?.port || 8080;
    const host = this.config?.host || 'localhost';
    
    // Check if WebSocket server is disabled (default behavior varies by environment)
    const isTestEnvironment = typeof process !== 'undefined' && 
                             (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);
    
    // Default enabled state is false in test environments, true otherwise 
    const enabled = this.config?.enabled ?? !isTestEnvironment;
    
    if (!enabled) {
      Logger.debug('WebSocket server is disabled, skipping start');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.listen(port, host, (error) => {
        if (error) {
          reject(error);
        } else {
          this.isRunning = true;
          this._startHeartbeat();
          Logger.debug(`WebSocket server running on ws://${host}:${port}`);
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
          Logger.debug('WebSocket server stopped');
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
    const clientIP = this._getClientIP(request);

    // Check connection limits by IP
    if (!this._isConnectionAllowed(clientIP)) {
      Logger.warn(`Connection refused for IP ${clientIP} - too many connections`);
      ws.close(1008, 'Too many connections from your IP');
      return;
    }

    // Check rate limiting for connection attempts
    if (!this._isConnectionRateAllowed(clientIP)) {
      Logger.warn(`Connection rate limited for IP ${clientIP}`);
      ws.close(1013, 'Too many connection attempts');
      return;
    }

    const clientId = this._generateClientId();
    const clientInfo = {
      id: clientId,
      type: 'unknown',
      connectedAt: new Date(),
      lastSeen: new Date(),
      ws: ws,
      ip: clientIP,
      userAgent: request.headers['user-agent'] || 'unknown',
      connectionAttempts: 1,
      status: 'connected',
      connectionId: this._generateConnectionId()
    };

    this.clients.set(clientId, clientInfo);
    
    // Update connection tracking
    this._trackConnection(clientIP);

    // Set up message handler
    ws.on('message', (data) => {
      this._handleMessage(clientId, data);
    });

    // Set up close handler
    ws.on('close', (code, reason) => {
      Logger.debug(`Client ${clientId} disconnected (code: ${code}, reason: ${reason?.toString() || 'none'})`);
      this._handleDisconnection(clientId);
    });

    // Set up error handler
    ws.on('error', (error) => {
      Logger.error(`WebSocket error for client ${clientId}`, error);
      // Don't immediately disconnect on error, let the close event handle it
      if (this.clients.has(clientId)) {
        const client = this.clients.get(clientId);
        client.status = 'error';
        client.error = error.message;
      }
    });

    // Send welcome message with client ID and server info
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId: clientId,
      serverInfo: {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: ['nars_protocol', 'realtime_streaming', 'task_sync']
      },
      connectionId: clientInfo.connectionId,
      timestamp: new Date().toISOString()
    });

    Logger.debug(`Client connected: ${clientId} from ${clientInfo.ip}`);

    // Emit connection event for other components
    if (this.core?.messages) {
      this.core.messages.emit('websocket.client.connected', {
        clientId,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        connectedAt: clientInfo.connectedAt,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if a connection from this IP is allowed based on limits
   */
  _isConnectionAllowed(ip) {
    if (!this.connectionLimits) {
      // Initialize connection limits from config
      this.connectionLimits = {
        maxPerIP: this.config.maxConnectionsPerIP || 10,
        maxTotal: this.config.maxTotalConnections || 1000
      };
    }

    // Count connections from this IP
    let ipConnectionCount = 0;
    for (const [_, client] of this.clients) {
      if (client.ip === ip) {
        ipConnectionCount++;
      }
    }

    // Check IP limit
    if (ipConnectionCount >= this.connectionLimits.maxPerIP) {
      return false;
    }

    // Check total connection limit
    if (this.clients.size >= this.connectionLimits.maxTotal) {
      return false;
    }

    return true;
  }

  /**
   * Check if connection rate from IP is acceptable
   */
  _isConnectionRateAllowed(ip) {
    if (!this.connectionRateTracker) {
      this.connectionRateTracker = new Map();
    }

    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxConnectionsPerWindow = this.config.maxConnectionRate || 10;

    if (!this.connectionRateTracker.has(ip)) {
      this.connectionRateTracker.set(ip, []);
    }

    const attempts = this.connectionRateTracker.get(ip);
    
    // Remove attempts older than the window
    const recentAttempts = attempts.filter(attempt => now - attempt < windowMs);
    
    // Check if too many attempts in the window
    if (recentAttempts.length >= maxConnectionsPerWindow) {
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.connectionRateTracker.set(ip, recentAttempts);

    return true;
  }

  /**
   * Track a new connection from an IP
   */
  _trackConnection(ip) {
    if (!this.connectionTracker) {
      this.connectionTracker = new Map();
    }

    if (!this.connectionTracker.has(ip)) {
      this.connectionTracker.set(ip, 0);
    }

    const count = this.connectionTracker.get(ip);
    this.connectionTracker.set(ip, count + 1);
  }

  _getClientIP(request) {
    // Try various headers that might contain the client IP
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           request.headers['x-real-ip'] ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.connection?.socket?.remoteAddress ||
           'unknown';
  }

  _generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      } else if (message.type === 'stream_request') {
        // Handle various streaming operations
        this._handleStreaming(clientId, message);
      } else if (message.type === 'subscribe_to_task') {
        // Subscribe to a specific task's updates
        this.subscribeToTaskStream(clientId, message.taskId);
        this.sendToClient(clientId, {
          type: 'subscription_success',
          taskId: message.taskId,
          timestamp: new Date().toISOString()
        });
      } else if (message.type === 'unsubscribe_from_task') {
        // Unsubscribe from a specific task's updates
        if (this.taskStreams.has(message.taskId)) {
          const stream = this.taskStreams.get(message.taskId);
          stream.participants.delete(clientId);
        }
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
      Logger.error(`Error parsing message from client ${clientId}`, error);
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

     Logger.debug(`Client ${clientId} identified as: ${client.type} (v${client.version})`);
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
     const { taskId, action, data, streamType = 'task' } = message;

     // Create or get the stream
     if (!this.taskStreams.has(taskId)) {
       this.taskStreams.set(taskId, {
         id: taskId,
         streamType,
         participants: new Set(),
         history: [],
         createdAt: new Date(),
         isActive: true
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
       streamType,
       timestamp: new Date().toISOString()
     }, [clientId]);
   }

  /**
   * Handle different types of streaming requests
   */
  _handleStreaming(clientId, message) {
    const { streamId, action, data, streamType } = message;

    const actionHandlers = {
      'subscribe': () => this._handleStreamSubscription(clientId, streamId, streamType, data),
      'unsubscribe': () => this._handleStreamUnsubscription(clientId, streamId),
      'publish': () => this._handleStreamPublish(clientId, streamId, data),
      'broadcast': () => this._handleStreamBroadcast(clientId, streamType, data)
    };
    
    const handler = actionHandlers[action];
    if (handler) {
      handler();
    } else {
      Logger.warn(`Unknown streaming action: ${action}`);
    }
  }

  _handleStreamSubscription(clientId, streamId, streamType, options = {}) {
    // Create a general purpose streaming channel
    if (!this.streams) this.streams = new Map();
    
    const fullStreamId = `${streamType}:${streamId}`;
    
    if (!this.streams.has(fullStreamId)) {
      this.streams.set(fullStreamId, {
        id: fullStreamId,
        type: streamType,
        participants: new Set(),
        buffer: [],
        bufferSize: options.bufferSize || 100,
        createdAt: new Date(),
        isActive: true
      });
    }

    const stream = this.streams.get(fullStreamId);
    stream.participants.add(clientId);

    // Send confirmation to subscriber
    this.sendToClient(clientId, {
      type: 'stream_subscription_confirmed',
      streamId: fullStreamId,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    Logger.debug(`Client ${clientId} subscribed to stream ${fullStreamId}`);
  }

  _handleStreamUnsubscription(clientId, streamId) {
    if (!this.streams) return;

    // Find and remove participant from any streams
    for (const [fullStreamId, stream] of this.streams) {
      if (stream.participants.has(clientId)) {
        stream.participants.delete(clientId);
        
        // Clean up empty streams if needed
        if (stream.participants.size === 0 && stream.id === streamId) {
          this.streams.delete(fullStreamId);
        }
      }
    }

    this.sendToClient(clientId, {
      type: 'stream_unsubscribed',
      streamId,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    Logger.debug(`Client ${clientId} unsubscribed from stream ${streamId}`);
  }

  _handleStreamPublish(clientId, streamId, data) {
    if (!this.streams) return;

    const stream = this.streams.get(streamId);
    if (!stream || !stream.isActive) {
      this.sendToClient(clientId, {
        type: 'stream_error',
        streamId,
        error: 'Stream not found or inactive',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Add data to stream buffer
    stream.buffer.push({
      source: clientId,
      data,
      timestamp: new Date()
    });

    // Maintain buffer size limit
    if (stream.buffer.length > stream.bufferSize) {
      stream.buffer = stream.buffer.slice(-stream.bufferSize);
    }

    // Broadcast to all participants in the stream
    for (const participantId of stream.participants) {
      if (participantId !== clientId) { // Don't send back to the publisher
        this.sendToClient(participantId, {
          type: 'stream_data',
          streamId: streamId,
          data: data,
          source: clientId,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  _handleStreamBroadcast(clientId, streamType, data) {
    if (!this.streams) return;

    // Find all streams of this type and broadcast to them
    for (const [fullStreamId, stream] of this.streams) {
      if (stream.type === streamType && stream.isActive) {
        this._handleStreamPublish(clientId, stream.id, data);
      }
    }

    // Also emit an internal event for other components
    if (this.core?.messages) {
      this.core.messages.emit(`stream.broadcast.${streamType}`, {
        source: clientId,
        data,
        streamType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create a real-time task stream for a specific task
   */
  createTaskStream(taskId, options = {}) {
    if (!this.taskStreams.has(taskId)) {
      this.taskStreams.set(taskId, {
        id: taskId,
        participants: new Set(),
        history: [],
        options: {
          bufferSize: options.bufferSize || 50,
          retentionTime: options.retentionTime || 3600000, // 1 hour
          streamType: options.streamType || 'task'
        },
        createdAt: new Date(),
        isActive: true
      });
    }

    return this.taskStreams.get(taskId);
  }

  /**
   * Publish a task update to its stream
   */
  publishTaskUpdate(taskId, updateData) {
    const stream = this.taskStreams.get(taskId);
    if (!stream || !stream.isActive) return false;

    stream.history.push({
      type: 'update',
      data: updateData,
      timestamp: new Date(),
      action: updateData.action || 'update'
    });

    // Maintain history size limit
    if (stream.history.length > stream.options.bufferSize) {
      stream.history = stream.history.slice(-stream.options.bufferSize);
    }

    // Broadcast to all participants
    for (const participantId of stream.participants) {
      this.sendToClient(participantId, {
        type: 'task_stream_update',
        taskId,
        update: updateData,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  /**
   * Subscribe to real-time task updates
   */
  subscribeToTaskStream(clientId, taskId) {
    if (!this.taskStreams.has(taskId)) {
      this.createTaskStream(taskId);
    }

    const stream = this.taskStreams.get(taskId);
    stream.participants.add(clientId);

    // Send initial data if available
    if (stream.history.length > 0) {
      this.sendToClient(clientId, {
        type: 'task_stream_history',
        taskId,
        history: stream.history.slice(-10), // Send last 10 updates
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  /**
   * Create a general event stream for real-time event broadcasting
   */
  createEventStream(eventType, options = {}) {
    if (!this.streams) this.streams = new Map();
    
    const streamId = `event:${eventType}`;
    
    if (!this.streams.has(streamId)) {
      this.streams.set(streamId, {
        id: streamId,
        type: 'event',
        eventType,
        participants: new Set(),
        buffer: [],
        bufferSize: options.bufferSize || 100,
        createdAt: new Date(),
        isActive: true
      });
    }

    return this.streams.get(streamId);
  }

  /**
   * Publish an event to the appropriate stream
   */
  publishEventToStream(eventType, eventData) {
    if (!this.streams) this.streams = new Map();
    
    const streamId = `event:${eventType}`;
    let stream = this.streams.get(streamId);
    
    if (!stream) {
      stream = this.createEventStream(eventType);
    }

    // Add to buffer
    stream.buffer.push({
      type: eventType,
      data: eventData,
      timestamp: new Date()
    });

    // Maintain buffer size
    if (stream.buffer.length > stream.bufferSize) {
      stream.buffer = stream.buffer.slice(-stream.bufferSize);
    }

    // Broadcast to all subscribers
    for (const participantId of stream.participants) {
      this.sendToClient(participantId, {
        type: 'event_stream_data',
        eventType,
        data: eventData,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  _handleNARSMessage(clientId, message) {
     const client = this.clients.get(clientId);
     if (!client) return;

     const { target, data, protocol = 'standard', command } = message;

     if (command === 'register_instance') {
       // Handle NARS instance registration
       this._handleNARSRegistration(clientId, data);
       return;
     } else if (command === 'sync_task') {
       // Handle task synchronization between instances
       this._handleTaskSynchronization(clientId, data);
       return;
     } else if (command === 'request_status') {
       // Handle status request from one NARS to another
       this._handleStatusRequest(clientId, target);
       return;
     } else if (command === 'broadcast_status') {
       // Handle status broadcast to all connected NARS instances
       this._handleStatusBroadcast(clientId, data);
       return;
     }

     // Enhanced NARS protocol with routing for general messages
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

  _handleNARSRegistration(clientId, registrationData) {
    const client = this.clients.get(clientId);
    if (!client || client.type !== 'nars') return;

    const instanceId = registrationData.instanceId || clientId;
    const version = registrationData.version || 'unknown';
    const capabilities = registrationData.capabilities || [];
    
    // Register or update the NARS instance
    this.narsInstances.set(clientId, {
      ...client,
      instanceId: instanceId,
      version: version,
      capabilities: capabilities,
      registeredAt: new Date(),
      lastSeen: new Date(),
      status: 'active'
    });

    // Send registration confirmation
    this.sendToClient(clientId, {
      type: 'nars_registration',
      status: 'success',
      instanceId: instanceId,
      registeredAt: new Date().toISOString(),
      message: 'NARS instance registered successfully'
    });

    Logger.debug(`NARS instance registered: ${instanceId} (client: ${clientId})`);

    // Emit registration event for other components to handle
    if (this.core?.messages) {
      this.core.messages.emit('nars.instance.registered', {
        instanceId,
        clientId,
        version,
        capabilities,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleTaskSynchronization(sourceClientId, taskData) {
    const sourceInstance = this.narsInstances.get(sourceClientId);
    if (!sourceInstance) {
      Logger.warn(`Task sync attempt from unregistered NARS instance: ${sourceClientId}`);
      return;
    }

    // Create a synchronization message
    const syncMessage = {
      type: 'nars_task_sync',
      sourceInstance: sourceInstance.instanceId,
      task: taskData.task,
      operation: taskData.operation || 'add', // add, update, delete
      timestamp: new Date().toISOString()
    };

    // Broadcast to all other NARS instances except the source
    for (const [clientId, instance] of this.narsInstances) {
      if (clientId !== sourceClientId) {
        this.sendToClient(clientId, syncMessage);
      }
    }

    Logger.debug(`Task synchronized from ${sourceInstance.instanceId}: ${taskData.operation} ${taskData.task?.term || 'unknown'}`);

    // Emit sync event for other components to handle
    if (this.core?.messages) {
      this.core.messages.emit('nars.task.sync', {
        sourceInstance: sourceInstance.instanceId,
        task: taskData.task,
        operation: taskData.operation,
        timestamp: new Date().toISOString()
      });
    }
  }

  _handleStatusRequest(sourceClientId, targetInstanceId) {
    const sourceInstance = this.narsInstances.get(sourceClientId);
    if (!sourceInstance) return;

    if (targetInstanceId === 'all') {
      // Send status of all instances
      const allStatus = this.getNARSInstances().map(instance => ({
        instanceId: instance.instanceId,
        type: instance.type,
        version: instance.version,
        status: instance.status || 'active',
        connectedAt: instance.connectedAt
      }));

      this.sendToClient(sourceClientId, {
        type: 'nars_status_response',
        status: 'all_instances',
        data: allStatus,
        timestamp: new Date().toISOString()
      });
    } else {
      // Find specific target instance
      let targetClient = null;
      for (const [clientId, instance] of this.narsInstances) {
        if (instance.instanceId === targetInstanceId) {
          targetClient = clientId;
          break;
        }
      }

      if (targetClient) {
        const targetInstance = this.narsInstances.get(targetClient);
        this.sendToClient(sourceClientId, {
          type: 'nars_status_response',
          status: 'single_instance',
          data: {
            instanceId: targetInstance.instanceId,
            type: targetInstance.type,
            version: targetInstance.version,
            status: targetInstance.status || 'active',
            connectedAt: targetInstance.connectedAt
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  _handleStatusBroadcast(sourceClientId, statusData) {
    const sourceInstance = this.narsInstances.get(sourceClientId);
    if (!sourceInstance) return;

    const broadcastMessage = {
      type: 'nars_status_broadcast',
      sourceInstance: sourceInstance.instanceId,
      status: statusData.status || 'active',
      health: statusData.health,
      metrics: statusData.metrics,
      timestamp: new Date().toISOString()
    };

    // Send to all other NARS instances
    for (const [clientId, instance] of this.narsInstances) {
      if (clientId !== sourceClientId) {
        this.sendToClient(clientId, broadcastMessage);
      }
    }

    Logger.debug(`Status broadcast from ${sourceInstance.instanceId}: ${statusData.status}`);
  }

  _handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      Logger.debug(`Client disconnected: ${clientId} (${client.type})`);
      
      // If it was a NARS instance, remove it from the registry
      if (this.narsInstances.has(clientId)) {
        this.removeNARSInstance(clientId);
      }
      
      this.clients.delete(clientId);
    }
  }

  _generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);  // Clear any existing interval
    }
    
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = this.heartbeatInterval * 2; // 2x heartbeat interval

      // Check for dead connections
      for (const [clientId, client] of this.clients) {
        if (now - client.lastSeen > timeout) {
          Logger.debug(`Client ${clientId} timed out`);
          client.ws.close(1000, 'Heartbeat timeout');
          this._handleDisconnection(clientId);  // Use the disconnection handler to clean up properly
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
      connectedAt: instance.connectedAt,
      registeredAt: instance.registeredAt,
      status: instance.status || 'active',
      lastSeen: instance.lastSeen,
      capabilities: instance.capabilities
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

  /**
   * Send a task to all connected NARS instances
   */
  broadcastTaskToNARS(task) {
    let sentCount = 0;
    
    for (const [clientId, instance] of this.narsInstances) {
      this.sendToClient(clientId, {
        type: 'nars_task',
        task,
        timestamp: new Date().toISOString()
      });
      sentCount++;
    }
    
    return sentCount;
  }

  /**
   * Send a request to a specific NARS instance and wait for response
   */
  async sendRequestToNARS(targetInstanceId, request, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const requestId = this._generateRequestId();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request to NARS instance ${targetInstanceId} timed out after ${timeout}ms`));
      }, timeout);

      // Set up response handler
      const responseHandler = (data) => {
        if (data.requestId === requestId && data.type === 'nars_response') {
          clearTimeout(timeoutId);
          this.off('nars_message', responseHandler); // Remove the handler after use
          resolve(data.payload);
        }
      };

      this.on('nars_message', responseHandler);

      // Send the request
      for (const [clientId, instance] of this.narsInstances) {
        if (instance.instanceId === targetInstanceId) {
          this.sendToClient(clientId, {
            type: 'nars_request',
            requestId: requestId,
            request: request,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // If no target instance found
      clearTimeout(timeoutId);
      this.off('nars_message', responseHandler);
      reject(new Error(`NARS instance ${targetInstanceId} not found`));
    });
  }

  /**
   * Get the status of a specific NARS instance
   */
  getNARSInstanceStatus(instanceId) {
    for (const [clientId, instance] of this.narsInstances) {
      if (instance.instanceId === instanceId) {
        return {
          instanceId: instance.instanceId,
          status: instance.status || 'active',
          version: instance.version,
          connectedAt: instance.connectedAt,
          registeredAt: instance.registeredAt,
          lastSeen: instance.lastSeen,
          capabilities: instance.capabilities,
          clientId: clientId
        };
      }
    }
    return null;
  }

  /**
   * Remove a NARS instance from the registry
   */
  removeNARSInstance(clientId) {
    if (this.narsInstances.has(clientId)) {
      const instance = this.narsInstances.get(clientId);
      Logger.debug(`Removing NARS instance: ${instance.instanceId} (client: ${clientId})`);
      
      this.narsInstances.delete(clientId);
      
      // Emit removal event
      if (this.core?.messages) {
        this.core.messages.emit('nars.instance.removed', {
          instanceId: instance.instanceId,
          clientId: clientId,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const clientTypes = {};
    const clientIPs = {};
    
    for (const client of this.clients.values()) {
      clientTypes[client.type] = (clientTypes[client.type] || 0) + 1;
      clientIPs[client.ip] = (clientIPs[client.ip] || 0) + 1;
    }

    const subscriptionStats = {};
    for (const [clientId, subscription] of this.subscriptions) {
      Array.from(subscription.eventTypes).forEach(eventType => {
        subscriptionStats[eventType] = (subscriptionStats[eventType] || 0) + 1;
      });
    }

    // Count active streams
    let totalStreamParticipants = 0;
    if (this.streams) {
      for (const stream of this.streams.values()) {
        totalStreamParticipants += stream.participants.size;
      }
    }

    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      clientsByType: clientTypes,
      clientsByIP: clientIPs,
      narsInstances: this.narsInstances.size,
      subscriptions: this.subscriptions.size,
      subscriptionStats,
      taskStreams: this.taskStreams.size,
      totalStreams: this.streams?.size || 0,
      totalStreamParticipants,
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0,
      connectionLimits: this.connectionLimits || {
        maxPerIP: 10,
        maxTotal: 1000
      },
      connectionStats: {
        trackedIPs: this.connectionTracker?.size || 0,
        totalConnectionAttempts: Array.from(this.connectionTracker?.values() || []).reduce((sum, count) => sum + count, 0)
      }
    };
  }
}

export default WebSocketServer;