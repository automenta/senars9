import { WebSocketUtils, DEFAULTS } from './WebSocketUtils.js';

/**
 * Centralized configuration management for all server components
 * Consolidates configuration patterns and provides consistent access
 */
class ServerConfig {
  constructor() {
    this.config = { ...DEFAULTS };
    this.serverConfig = {};
    this.websocketConfig = {};
    this.connectionLimits = {};
    this.streamSettings = {};
  }

  initialize(baseConfig = {}) {
    this.config = WebSocketUtils.mergeConfig(this.config, baseConfig);

    // Extract specific config sections
    this.serverConfig = {
      port: this.config.port ?? DEFAULTS.PORT,
      host: this.config.host ?? DEFAULTS.HOST,
      enabled: this.config.enabled ?? DEFAULTS.ENABLED
    };

    this.websocketConfig = {
      heartbeatInterval: this.config.heartbeatInterval ?? DEFAULTS.HEARTBEAT_INTERVAL,
      maxConnectionsPerIP: this.config.maxConnectionsPerIP ?? DEFAULTS.MAX_CONNECTIONS_PER_IP,
      maxTotalConnections: this.config.maxTotalConnections ?? DEFAULTS.MAX_TOTAL_CONNECTIONS,
      maxConnectionRate: this.config.maxConnectionRate ?? DEFAULTS.MAX_CONNECTION_RATE
    };

    this.connectionLimits = {
      maxPerIP: this.websocketConfig.maxConnectionsPerIP,
      maxTotal: this.websocketConfig.maxTotalConnections
    };

    this.streamSettings = {
      bufferSize: this.config.streamBufferSize ?? DEFAULTS.STREAM_BUFFER_SIZE,
      taskBufferSize: this.config.taskStreamBufferSize ?? DEFAULTS.TASK_STREAM_BUFFER_SIZE,
      historyLimit: this.config.taskHistoryLimit ?? DEFAULTS.TASK_HISTORY_LIMIT,
      retentionTime: this.config.retentionTime ?? DEFAULTS.RETENTION_TIME
    };
  }

  get(key, defaultValue = null) {
    return WebSocketUtils.getConfigValue(this.config, key, defaultValue);
  }

  getServerConfig() {
    return { ...this.serverConfig };
  }

  getWebSocketConfig() {
    return { ...this.websocketConfig };
  }

  getConnectionLimits() {
    return { ...this.connectionLimits };
  }

  getStreamSettings() {
    return { ...this.streamSettings };
  }

  isFeatureEnabled(feature) {
    return this.config.features?.[feature] ?? false;
  }

  updateConfig(updates) {
    this.config = WebSocketUtils.mergeConfig(this.config, updates);
    this.initialize(this.config); // Reinitialize derived configs
  }
}

export default ServerConfig;