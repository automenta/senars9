// WebSocket utility functions and constants
import { Logger } from './base/utilities.js';

const DEFAULTS = {
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
  MESSAGE_QUEUE_LIMIT: 1000
};

const MESSAGE_TYPES = {
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
};

const CLIENT_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

const STREAM_TYPES = {
  TASK: 'task',
  GENERAL: 'general'
};

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

  static isValidClient(client) {
    return client && client.ws && client.ws.readyState === 1;
  }

  static formatTaskData(task) {
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
    if (task.isBelief?.()) return 'Belief';
    if (task.isGoal?.()) return 'Goal';
    if (task.isQuestion?.()) return 'Question';
    return 'Derived';
  }

  static getTaskType(task) {
    if (!task) return 'Unknown';
    if (task.punctuation === '.') return 'Belief';
    if (task.punctuation === '!') return 'Goal';
    if (task.punctuation === '?') return 'Question';
    return 'Derived';
  }

  static extractLegacyConcepts(core) {
    const concepts = [];
    if (core.memory.conceptStorage) {
      for (const [hash, concept] of core.memory.conceptStorage) {
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

  static checkEventFilters(subscriptionFilters, eventFilters) {
    for (const [key, value] of Object.entries(subscriptionFilters)) {
      if (eventFilters[key] !== value) return false;
    }
    return true;
  }

  static countByProperty(collection, property) {
    return Array.from(collection).reduce((counts, item) => {
      counts[item[property]] = (counts[item[property]] || 0) + 1;
      return counts;
    }, {});
  }

  static createMessage(type, payload = {}, timestamp = null) {
    return {
      type,
      payload,
      timestamp: timestamp || new Date().toISOString()
    };
  }

  static createErrorResponse(command, error) {
    return this.createMessage(MESSAGE_TYPES.COMMAND_RESPONSE, {
      command,
      status: 'error',
      error: error.message
    });
  }

  static createSuccessResponse(command, data = {}) {
    return this.createMessage(MESSAGE_TYPES.COMMAND_RESPONSE, {
      command,
      status: 'success',
      ...data
    });
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
    const state = { tasks: [], concepts: [], stats: {} };

    if (!core?.memory) return state;

    const allTasks = core.memory.getAllTasks?.() || [];
    state.tasks = allTasks.map(task => this.formatTaskData(task));

    if (core.memory.getTopConcepts) {
      state.concepts = core.memory.getTopConcepts(50).map(c => this.formatConceptData(c));
    } else {
      state.concepts = this.extractLegacyConcepts(core);
    }

    return state;
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
    this.log('debug', message, ...args);
  }

  static warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  static error(message, ...args) {
    this.log('error', message, ...args);
  }
}

export { DEFAULTS, MESSAGE_TYPES, CLIENT_STATUS, STREAM_TYPES, WebSocketUtils };
export default WebSocketUtils;