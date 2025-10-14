import Logger from './Logger.js';


const DEFAULTS = Object.freeze({
  PORT: 8080,
  HOST: 'localhost',
  HEARTBEAT_INTERVAL: 30000,
  MAX_CONNECTIONS_PER_IP: 10,
  MAX_TOTAL_CONNECTIONS: 1000,
  MAX_CONNECTION_RATE: 10,
  CONNECTION_RATE_WINDOW: 60000,
  STREAM_BUFFER_SIZE: 100,
  TASK_STREAM_BUFFER_SIZE: 50,
  TASK_HISTORY_LIMIT: 10,
  RETENTION_TIME: 3600000,
  CLIENT_TIMEOUT_MULTIPLIER: 2,
  MESSAGE_QUEUE_LIMIT: 1000,
  ENABLED: true
});

// Global config manager instance - will be initialized when needed
let configManager = null;

const getConfigManager = () => {
  if (!configManager) {
    // Dynamic import to avoid circular dependencies
    import('./ServerConfig.js').then(({ default: ServerConfig }) => {
      configManager = new ServerConfig();
      configManager.initialize();
    });
  }
  return configManager;
};

const MESSAGE_TYPES = Object.freeze({
  WELCOME: 'welcome',
  HEARTBEAT: 'heartbeat',
  COMPLETE_STATE: 'complete_state',
  SUBSCRIPTION_CONFIRMED: 'subscription_confirmed',
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  TASK_UPDATE: 'task_update',
  TASK_STREAM_UPDATE: 'task_stream_update',
  TASK_STREAM_HISTORY: 'task_stream_history',
  STREAM_SUBSCRIPTION_CONFIRMED: 'stream_subscription_confirmed',
  STREAM_UNSUBSCRIBED: 'stream_unsubscribed',
  STREAM_DATA: 'stream_data',
  STREAM_ERROR: 'stream_error',
  COMMAND_RESPONSE: 'command_response',
  EVENT: 'event',
  ERROR: 'error'
});

const CLIENT_STATUS = Object.freeze({
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
});

const STREAM_TYPES = Object.freeze({
  TASK: 'task',
  GENERAL: 'general'
});

class WebSocketUtils {
  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateClientId() {
    return this.generateId('client');
  }

  static generateConnectionId() {
    return this.generateId('conn');
  }

  static getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           request.headers['x-real-ip'] ||
           request.connection?.remoteAddress ||
           request.socket?.remoteAddress ||
           request.connection?.socket?.remoteAddress ||
           'unknown';
  }

  static formatTaskData(task) {
    if (!task) return null;

    return {
      id: task.hashCode?.() || task.id || this.generateId('task'),
      content: task.toString?.() || task.content || 'Unknown Task',
      priority: task.getPriority?.() || task.priority || 0.5,
      status: this.getTaskStatus(task),
      type: this.getTaskType(task),
      createdAt: task.createdAt || Date.now(),
      lastModified: task.getAccessedAt?.() || Date.now(),
      punctuation: task.punctuation || '.',
      truth: task.truth || null,
      occurrenceTime: task.occurrenceTime || Date.now(),
      derivationPath: task.derivationPath || []
    };
  }

  static formatConceptData(concept) {
    if (!concept) return null;

    return {
      id: concept.id,
      content: concept.term?.toString() || concept.concept?.term?.toString() || concept.term || 'Unknown Concept',
      priority: concept.priority || 0,
      taskCount: concept.taskCount || 0,
      type: concept.term?.termType || 'concept'
    };
  }

  static getTaskStatus(task) {
    if (!task) return 'Unknown';
    return task.isBelief?.() ? 'Belief' : task.isGoal?.() ? 'Goal' : task.isQuestion?.() ? 'Question' : 'Derived';
  }

  static getTaskType(task) {
    if (!task) return 'Unknown';
    return task.punctuation === '.' ? 'Belief' : task.punctuation === '!' ? 'Goal' : task.punctuation === '?' ? 'Question' : 'Derived';
  }

  static extractLegacyConcepts(core) {
    if (!core?.memory?.conceptStorage) return [];

    const concepts = [];
    for (const [hash, concept] of core.memory.conceptStorage) {
      concepts.push({
        id: hash,
        content: concept.term?.toString() || concept.name || 'Unknown Concept',
        priority: concept.taskTable ? concept.taskTable.size : 0,
        type: concept.term?.termType || 'concept'
      });
    }
    return concepts;
  }

  static checkEventFilters(subscriptionFilters, eventFilters) {
    for (const [key, value] of Object.entries(subscriptionFilters)) {
      if (eventFilters[key] !== value) return false;
    }
    return true;
  }

  static countByProperty(collection, property) {
    return Array.from(collection).reduce((counts, item) => (
      counts[item[property]] = (counts[item[property]] || 0) + 1, counts
    ), {});
  }

  static createMessage(type, payload = {}, timestamp = null) {
    return {
      type,
      payload,
      timestamp: timestamp || new Date().toISOString()
    };
  }

  static createResponse(command, status, data = {}) {
    return status === 'error'
      ? WebSocketUtils.createErrorResponse(command, data)
      : WebSocketUtils.createSuccessResponse(command, data);
  }

  static createErrorResponse(command, error) {
    return {
      type: 'response',
      command,
      status: 'error',
      error: error.message || error || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }

  static createSuccessResponse(command, data = {}) {
    return {
      type: 'response',
      command,
      status: 'success',
      data,
      timestamp: new Date().toISOString()
    };
  }

  static createWelcomeMessage(clientId, connectionId) {
    return this.createMessage(MESSAGE_TYPES.WELCOME, {
      clientId,
      serverInfo: {
        version: '2.0.0',
        features: ['nars_protocol', 'realtime_streaming', 'task_sync']
      },
      connectionId
    });
  }

  static createHeartbeatMessage() {
    return this.createMessage(MESSAGE_TYPES.HEARTBEAT);
  }

  static createStreamMessage(type, streamId, data, source = null) {
    return this.createMessage(type, { streamId, data, source });
  }

  static createTaskMessage(type, taskId, data, source = null) {
    return this.createMessage(type, { taskId, data, source });
  }

  static createEventMessage(eventType, data, filters = {}) {
    return this.createMessage(MESSAGE_TYPES.EVENT, { eventType, data, filters });
  }
  
  // Unified message creation method with context
  static createTypedMessage(messageType, payload, context = {}) {
    return this.createMessage(messageType, { ...payload, ...context });
  }

  static validateMessage(data) {
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      throw new Error(`Invalid message format: ${error.message}`);
    }
  }

  static isConnectionAllowed(clients, clientIP, config) {
    const limits = {
      maxPerIP: config.maxConnectionsPerIP || DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotal: config.maxTotalConnections || DEFAULTS.MAX_TOTAL_CONNECTIONS
    };

    const ipCount = Array.from(clients.values()).filter(c => c.ip === clientIP).length;
    return ipCount < limits.maxPerIP && clients.size < limits.maxTotal;
  }

  static isConnectionRateAllowed(connectionRateTracker, clientIP, config) {
    const now = Date.now();
    const windowMs = DEFAULTS.CONNECTION_RATE_WINDOW;
    const maxPerWindow = config.maxConnectionRate || DEFAULTS.MAX_CONNECTION_RATE;

    const attempts = connectionRateTracker.get(clientIP) || [];
    const recentAttempts = attempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxPerWindow) return false;

    recentAttempts.push(now);
    connectionRateTracker.set(clientIP, recentAttempts);
    return true;
  }

  static getSystemStats(core) {
    return {
      isRunning: false,
      isPaused: true,
      cycles: 0,
      tasks: 0,
      concepts: 0,
      timestamp: Date.now()
    };
  }

  static extractSystemState(core) {
    if (!core?.memory) return { tasks: [], concepts: [], stats: {} };

    const allTasks = core.memory.getAllTasks?.() || [];
    const tasks = allTasks.map(task => this.formatTaskData(task)).filter(Boolean);

    const concepts = core.memory.getTopConcepts ?
      core.memory.getTopConcepts(50).map(c => this.formatConceptData(c)).filter(Boolean) :
      this.extractLegacyConcepts(core);

    return { tasks, concepts, stats: {} };
  }

  static addSystemStatsToState(core, state) {
    state.stats = core.cycle ? {
      isRunning: core.cycle.isRunning,
      isPaused: core.cycle.isPaused,
      cycles: core.cycle.cycleCount,
      tasks: state.tasks.length,
      concepts: state.concepts.length,
      timestamp: Date.now()
    } : core.messages ? this.getSystemStats(core) : state.stats;

    return state;
  }

  static createCompleteStateMessage(core) {
    const state = this.extractSystemState(core);
    this.addSystemStatsToState(core, state);
    return this.createMessage(MESSAGE_TYPES.COMPLETE_STATE, state);
  }

  static log(level, message, ...args) {
    Logger[level]?.(message, ...args);
  }

  static debug(message, ...args) {
    Logger.debug(message, ...args);
  }

  static warn(message, ...args) {
    Logger.warn(message, ...args);
  }

  static error(message, ...args) {
    Logger.error(message, ...args);
  }

  // Common validation and checking utilities
  static isValidClient(client) {
    return client?.ws?.readyState === 1;
  }

  static hasParticipants(stream) {
    return stream?.participants?.size > 0;
  }

  static isActiveStream(stream) {
    return stream?.isActive && this.hasParticipants(stream);
  }

  // Consolidated error handling patterns
  static handleError(operation, error, clientId = null) {
    const errorMsg = `Error ${operation}${clientId ? ` for client ${clientId}` : ''}: ${error.message || error}`;
    this.error(errorMsg);
    return errorMsg;
  }

  static sendError(wss, clientId, operation, error) {
    const errorResponse = this.createErrorResponse(operation, error);
    wss?.sendToClient?.(clientId, errorResponse);
  }

  static handleAndSendError(wss, operation, error, clientId = null) {
    const errorMsg = this.handleError(operation, error, clientId);
    if (wss && clientId) {
      this.sendError(wss, clientId, operation, error);
    }
    return errorMsg;
  }

  // Enhanced error handling for different contexts using a generic pattern
  static handleContextualError(wss, clientId, operation, error, context = {}) {
    const contextStr = Object.keys(context).length > 0 ? ` for ${Object.entries(context).map(([k, v]) => `${k}: ${v}`).join(', ')}` : '';
    const errorMsg = `${operation} failed${contextStr}${clientId ? ` (client: ${clientId})` : ''}: ${error.message || error}`;
    this.error(errorMsg);

    if (wss && clientId) {
      const errorResponse = this.createErrorResponse(operation, { message: errorMsg, ...context });
      wss.sendToClient(clientId, errorResponse);
    }
    return errorMsg;
  }

  // Specific error handlers using the generic pattern
  static handleConnectionError(wss, clientId, operation, error) {
    return this.handleContextualError(wss, clientId, operation, error, {});
  }

  static handleStreamError(wss, clientId, streamId, operation, error) {
    return this.handleContextualError(wss, clientId, operation, error, { streamId });
  }

  static handleTaskError(wss, clientId, taskId, operation, error) {
    return this.handleContextualError(wss, clientId, operation, error, { taskId });
  }

  static handleGenericError(wss, clientId, operation, error, context = {}) {
    return this.handleContextualError(wss, clientId, operation, error, context);
  }

  // Common stream operations
  static addToStreamBuffer(stream, data, source, maxSize = null) {
    const bufferSize = maxSize || stream.options?.bufferSize || DEFAULTS.STREAM_BUFFER_SIZE;
    stream.buffer.push({ source, data, timestamp: new Date() });

    if (stream.buffer.length > bufferSize) {
      stream.buffer = stream.buffer.slice(-bufferSize);
    }
  }

  static broadcastToParticipants(wss, participants, message, excludeClient = null) {
    const excludeSet = new Set(excludeClient ? [excludeClient] : []);
    participants.forEach(participantId => {
      if (!excludeSet.has(participantId)) {
        wss.sendToClient(participantId, message);
      }
    });
  }

  // Common configuration helpers
   static getConfigValue(config, key, defaultValue) {
     return config?.[key] ?? defaultValue;
   }

   static mergeConfig(baseConfig, overrides) {
     return { ...baseConfig, ...overrides };
   }

   // Configuration-aware helpers using ConfigManager
   static getServerPort() {
     return getConfigManager()?.getServerConfig().port ?? DEFAULTS.PORT;
   }

   static getServerHost() {
     return getConfigManager()?.getServerConfig().host ?? DEFAULTS.HOST;
   }

   static getHeartbeatInterval() {
     return getConfigManager()?.getWebSocketConfig().heartbeatInterval ?? DEFAULTS.HEARTBEAT_INTERVAL;
   }

   static getConnectionLimits() {
     return getConfigManager()?.getConnectionLimits() ?? {
       maxPerIP: DEFAULTS.MAX_CONNECTIONS_PER_IP,
       maxTotal: DEFAULTS.MAX_TOTAL_CONNECTIONS
     };
   }

   static getStreamSettings() {
     return getConfigManager()?.getStreamSettings() ?? {
       bufferSize: DEFAULTS.STREAM_BUFFER_SIZE,
       taskBufferSize: DEFAULTS.TASK_STREAM_BUFFER_SIZE,
       historyLimit: DEFAULTS.TASK_HISTORY_LIMIT,
       retentionTime: DEFAULTS.RETENTION_TIME
     };
   }

   static isFeatureEnabled(feature) {
     return getConfigManager()?.isFeatureEnabled(feature) ?? false;
   }

  // Factory functions for common objects
  static createClientInfo(clientId, ws, request, clientIP) {
    return {
      id: clientId,
      type: 'unknown',
      connectedAt: new Date(),
      lastSeen: new Date(),
      ws: ws,
      ip: clientIP,
      userAgent: request.headers['user-agent'] || 'unknown',
      connectionAttempts: 1,
      status: CLIENT_STATUS.CONNECTED,
      connectionId: this.generateConnectionId()
    };
  }

  static createStream(streamId, streamType, options = {}) {
    return {
      id: streamId,
      type: streamType,
      participants: new Set(),
      buffer: [],
      bufferSize: options.bufferSize || DEFAULTS.STREAM_BUFFER_SIZE,
      createdAt: new Date(),
      isActive: true
    };
  }

  static createTaskStream(taskId, options = {}) {
    return {
      id: taskId,
      participants: new Set(),
      history: [],
      options: {
        bufferSize: options.bufferSize || DEFAULTS.TASK_STREAM_BUFFER_SIZE,
        retentionTime: options.retentionTime || DEFAULTS.RETENTION_TIME,
        streamType: options.streamType || STREAM_TYPES.TASK
      },
      createdAt: new Date(),
      isActive: true
    };
  }

  static createSubscription(eventTypes = [], filters = {}) {
    return {
      eventTypes: new Set(eventTypes),
      filters,
      subscribedAt: new Date(),
      lastUpdated: new Date()
    };
  }
  
  // Utility to wrap operations with consistent error handling
  static withErrorHandling(operation, wss, operationName, clientId = null) {
    try {
      return operation();
    } catch (error) {
      return this.handleAndSendError(wss, operationName, error, clientId);
    }
  }
}

export { DEFAULTS, MESSAGE_TYPES, CLIENT_STATUS, STREAM_TYPES, WebSocketUtils };
export default WebSocketUtils;