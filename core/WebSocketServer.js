import { WebSocketServer as WSServer } from 'ws';
import { createServer } from 'http';
import Component from './base/Component.js';
import { Logger } from './base/utilities.js';

class WebSocketServer extends Component {
  constructor(core) {
    super();
    this.core = core; // Core is optional for testing
    this.wss = null;
    this.server = null;
    this.clients = new Map();
    this.heartbeatInterval = null;
    this.isRunning = false;
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

    this.wss.on('connection', (ws, request) => this._handleConnection(ws, request));
    this.wss.on('error', (error) => Logger.error('WebSocket server error', error));

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
          Logger.debug(`WebSocket server running on ws://${host}:${port} for Core`);
          resolve();
        }
      });
    });
  }

  // Extract current system state into standardized format
  _extractSystemState() {
    const state = { tasks: [], concepts: [], stats: {} };

    if (!this.core?.memory) {
      // Return empty state if no core available (for testing)
      return state;
    }

    // Extract tasks with consistent formatting
    const allTasks = this.core.memory.getAllTasks?.() || [];
    state.tasks = allTasks.map(task => this._formatTaskData(task));

    // Extract concepts with fallback handling
    this.core.memory.getTopConcepts ?
      state.concepts = this.core.memory.getTopConcepts(50).map(c => this._formatConceptData(c)) :
      state.concepts = this._extractLegacyConcepts();

    return state;
  }

  // Format task data consistently
  _formatTaskData(task) {
    return {
      id: task.hashCode?.() || task.id || `task_${Date.now()}`,
      content: task.toString?.() || task.content || 'Unknown Task',
      priority: task.getPriority?.() || task.priority || 0.5,
      status: this._getTaskStatus(task),
      type: this._getTaskType(task),
      createdAt: task.createdAt || Date.now(),
      lastModified: task.getAccessedAt?.() || Date.now(),
      punctuation: task.punctuation || '.',
      truth: task.truth || null,
      occurrenceTime: task.occurrenceTime || Date.now(),
      derivationPath: task.derivationPath || []
    };
  }

  // Format concept data consistently
  _formatConceptData(c) {
    return {
      id: c.id,
      content: c.term?.toString() || c.concept?.term?.toString() || c.term || 'Unknown Concept',
      priority: c.priority || 0,
      taskCount: c.taskCount || 0,
      type: c.term?.termType || 'concept'
    };
  }

  // Extract concepts from legacy storage format
  _extractLegacyConcepts() {
    const concepts = [];
    if (this.core.memory.conceptStorage) {
      for (const [hash, concept] of this.core.memory.conceptStorage) {
        concepts.push({
          id: hash,
          content: concept.term?.toString() || concept.name || 'Unknown Concept',
          priority: concept.taskTable ? concept.taskTable.size : 0,
          type: concept.term?.termType || 'concept'
        });
      }
    }
    return concepts;
  }

  // Broadcast full current state to all clients
  broadcastCurrentState() {
    if (!this.core?.memory) {
      Logger.warn('No core memory available for state broadcasting');
      return;
    }

    try {
      const state = this._extractSystemState();

      // Add system stats
      state.stats = this.core.cycle ? {
        isRunning: this.core.cycle.isRunning,
        isPaused: this.core.cycle.isPaused,
        cycles: this.core.cycle.cycleCount,
        tasks: state.tasks.length,
        concepts: state.concepts.length,
        timestamp: Date.now()
      } : this.core.messages ? this._getSystemStats() : state.stats;

      this.broadcast({
        type: 'complete_state',
        payload: state,
        timestamp: Date.now()
      });

    } catch (error) {
      Logger.error('Error broadcasting current state', error);
    }
  }

  // Helper to get task status
  _getTaskStatus(task) {
    if (!task) return 'Unknown';
    if (task.isBelief && task.isBelief()) return 'Belief';
    if (task.isGoal && task.isGoal()) return 'Goal';
    if (task.isQuestion && task.isQuestion()) return 'Question';
    return 'Derived';
  }

  // Helper to get task type
  _getTaskType(task) {
    if (!task) return 'Unknown';
    if (task.punctuation === '.') return 'Belief';
    if (task.punctuation === '!') return 'Goal';
    if (task.punctuation === '?') return 'Question';
    return 'Derived';
  }

  // Helper to get system stats
  _getSystemStats() {
    return {
      isRunning: false,
      isPaused: true,
      cycles: 0,
      tasks: 0,
      concepts: 0,
      timestamp: Date.now()
    };
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

    // Send current state to the new client specifically
    setImmediate(() => {
      if (this.core) {
        try {
          const state = this._extractSystemState();

          // Add system stats
          state.stats = this.core.cycle ? {
            isRunning: this.core.cycle.isRunning,
            isPaused: this.core.cycle.isPaused,
            cycles: this.core.cycle.cycleCount,
            tasks: state.tasks.length,
            concepts: state.concepts.length,
            timestamp: Date.now()
          } : this.core.messages ? this._getSystemStats() : state.stats;

          this.sendToClient(clientId, {
            type: 'complete_state',
            payload: state,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          Logger.error('Error sending current state to new client', error);
        }
      }
    });
  }

  _isConnectionAllowed(ip) {
    this.connectionLimits ||= {
      maxPerIP: this.config.maxConnectionsPerIP || 10,
      maxTotal: this.config.maxTotalConnections || 1000
    };

    const ipConnectionCount = Array.from(this.clients.values())
      .filter(client => client.ip === ip).length;

    return ipConnectionCount < this.connectionLimits.maxPerIP &&
           this.clients.size < this.connectionLimits.maxTotal;
  }

  _isConnectionRateAllowed(ip) {
    this.connectionRateTracker ||= new Map();

    const now = Date.now();
    const windowMs = 60000;
    const maxConnectionsPerWindow = this.config.maxConnectionRate || 10;

    const attempts = this.connectionRateTracker.get(ip) || [];
    const recentAttempts = attempts.filter(attempt => now - attempt < windowMs);

    if (recentAttempts.length >= maxConnectionsPerWindow) return false;

    recentAttempts.push(now);
    this.connectionRateTracker.set(ip, recentAttempts);

    return true;
  }

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
      const handler = this._getMessageHandler(message.type);

      handler ? handler.call(this, clientId, message) :
        this._handleCustomMessage(clientId, client, message);

    } catch (error) {
      Logger.error(`Error parsing message from client ${clientId}`, error);
    }
  }

  // Message handler registry for clean separation of concerns
  _getMessageHandler(type) {
    const handlers = {
      identify: this._handleIdentify,
      heartbeat: () => null, // Heartbeat response - no action needed
      subscribe: this._handleSubscription,
      unsubscribe: this._handleUnsubscription,
      task_stream: this._handleTaskStream,
      stream_request: this._handleStreaming,
      subscribe_to_task: (clientId, msg) => this._handleTaskSubscription(clientId, msg),
      unsubscribe_from_task: (clientId, msg) => this._handleTaskUnsubscription(clientId, msg),
      command: this._handleCommand
    };

    return handlers[type];
  }

  _handleTaskSubscription(clientId, message) {
    this.subscribeToTaskStream(clientId, message.taskId);
    this.sendToClient(clientId, {
      type: 'subscription_success',
      taskId: message.taskId,
      timestamp: new Date().toISOString()
    });
  }

  _handleTaskUnsubscription(clientId, message) {
    const stream = this.taskStreams.get(message.taskId);
    if (stream) stream.participants.delete(clientId);
  }

  _handleCustomMessage(clientId, client, message) {
    this.emit('message', {
      clientId,
      clientType: client.type,
      message,
      timestamp: new Date()
    });
  }

  _handleCommand(clientId, message) {
    const { command, data } = message;

    if (!this.core?.messages) {
      Logger.warn('Core messages component not available - command ignored');
      this._sendErrorResponse(clientId, message.command || 'unknown', new Error('Core not available'));
      return;
    }

    const commandMap = {
      'start': 'cycle.start',
      'stop': 'cycle.stop',
      'pause': 'cycle.pause',
      'resume': 'cycle.resume',
      'step': 'cycle.step',
      'reset': 'cycle.reset',
      'throttle': 'cycle.throttle'
    };

    const internalCommand = commandMap[command];

    if (!internalCommand) {
      Logger.warn(`Unknown command: ${command}`);
      return;
    }

    try {
      this._executeCommand(internalCommand, data);
      this._sendSuccessResponse(clientId, command);
    } catch (error) {
      Logger.error(`Error executing command ${internalCommand}:`, error);
      this._sendErrorResponse(clientId, command, error);
    }
  }

  _executeCommand(command, data) {
    if (command === 'cycle.throttle' && data && this.core.cycle) {
      Logger.debug(`Throttle request: ${data.value}%`);
    } else if (command === 'cycle.reset' && this.core.cycle) {
      this.core.cycle.cycleCount = 0;
      this.core.messages.emit('cycle.stats', {
        cycles: this.core.cycle.cycleCount,
        timestamp: Date.now()
      });
    } else {
      this.core.messages.execute(command, data);
    }
  }

  _handleIdentify(clientId, message) {
     const client = this.clients.get(clientId);
     if (!client) return;

     client.type = message.clientType || 'unknown';
     client.version = message.version || 'unknown';
     client.capabilities = message.capabilities || [];

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
    if (this.core?.messages && this.core.messages.emit) {
      this.core.messages.emit(`stream.broadcast.${streamType}`, {
        source: clientId,
        data,
        streamType,
        timestamp: new Date().toISOString()
      });
    }
  }

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

  _handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      Logger.debug(`Client disconnected: ${clientId} (${client.type})`);
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

  // Utility method for consistent client message sending
  _sendClientMessage(clientId, message) {
    this.sendToClient(clientId, { ...message, timestamp: new Date().toISOString() });
  }

  // Utility method for consistent error responses
  _sendErrorResponse(clientId, command, error) {
    this._sendClientMessage(clientId, {
      type: 'command_response',
      command,
      status: 'error',
      error: error.message
    });
  }

  // Utility method for consistent success responses
  _sendSuccessResponse(clientId, command, data = {}) {
    this._sendClientMessage(clientId, {
      type: 'command_response',
      command,
      status: 'success',
      ...data
    });
  }

  getStats() {
    const clientTypes = this._countByProperty(this.clients.values(), 'type');
    const clientIPs = this._countByProperty(this.clients.values(), 'ip');

    const subscriptionStats = this._countSubscriptionTypes();

    const totalStreamParticipants = this.streams ?
      Array.from(this.streams.values()).reduce((sum, stream) => sum + stream.participants.size, 0) : 0;

    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      clientsByType: clientTypes,
      clientsByIP: clientIPs,
      narsInstances: 0, // Always 0 in 1:1 architecture
      subscriptions: this.subscriptions.size,
      subscriptionStats,
      taskStreams: this.taskStreams.size,
      totalStreams: this.streams?.size || 0,
      totalStreamParticipants,
      uptime: this.isRunning ? Date.now() - (this.startTime || Date.now()) : 0,
      connectionLimits: this.connectionLimits || { maxPerIP: 10, maxTotal: 1000 },
      connectionStats: {
        trackedIPs: this.connectionTracker?.size || 0,
        totalConnectionAttempts: Array.from(this.connectionTracker?.values() || []).reduce((sum, count) => sum + count, 0)
      }
    };
  }

  _countByProperty(collection, property) {
    return Array.from(collection).reduce((counts, item) => {
      counts[item[property]] = (counts[item[property]] || 0) + 1;
      return counts;
    }, {});
  }

  _countSubscriptionTypes() {
    return Array.from(this.subscriptions.values())
      .flatMap(sub => Array.from(sub.eventTypes))
      .reduce((counts, eventType) => {
        counts[eventType] = (counts[eventType] || 0) + 1;
        return counts;
      }, {});
  }

  // DEPRECATED Backward compatibility methods for existing tests and demos
  getNARSInstances() {
    // In the new 1:1 architecture, we don't manage multiple NARS instances
    // Return empty array for backward compatibility
    return [];
  }

  broadcastTaskToNARS(task) {
    // In the new architecture, broadcast to all connected clients
    this.broadcast({
      type: 'nars_task',
      task,
      timestamp: new Date().toISOString()
    });
    return 1; // Return count of "instances" (clients)
  }

  getNARSInstanceStatus(instanceId) {
    // In the new architecture, we don't track NARS instances separately
    return null;
  }

  sendRequestToNARS(targetInstanceId, request, timeout = 5000) {
    // In the new architecture, send to all clients
    return Promise.resolve({ success: false, error: 'Not supported in 1:1 architecture' });
  }

  // Stub methods for backward compatibility
  _handleNARSRegistration(clientId, registrationData) {
    Logger.debug(`NARS registration attempt from ${clientId}: ${registrationData.instanceId}`);
  }

  _handleTaskSynchronization(sourceClientId, taskData) {
    Logger.debug(`Task sync attempt from ${sourceClientId}: ${taskData.operation}`);
  }

  _handleStatusRequest(sourceClientId, targetInstanceId) {
    Logger.debug(`Status request from ${sourceClientId} for ${targetInstanceId}`);
  }

  _handleStatusBroadcast(sourceClientId, statusData) {
    Logger.debug(`Status broadcast from ${sourceClientId}: ${statusData.status}`);
  }
}

export default WebSocketServer;