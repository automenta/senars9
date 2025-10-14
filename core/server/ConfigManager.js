import { WebSocketUtils } from './WebSocketUtils.js';

class ConfigManager {
  constructor() {
    this.defaultConfig = this.getDefaultConfig();
    this.config = { ...this.defaultConfig };
  }

  getDefaultConfig() {
    return {
      // Server configuration
      server: {
        port: 8080,
        host: 'localhost',
        enabled: true,
        maxConnectionsPerIP: 10,
        maxTotalConnections: 1000,
        maxConnectionRate: 10,
        connectionRateWindow: 60000
      },

      // WebSocket configuration
      websocket: {
        heartbeatInterval: 30000,
        clientTimeoutMultiplier: 2,
        messageQueueLimit: 1000,
        streamBufferSize: 100,
        taskStreamBufferSize: 50,
        taskHistoryLimit: 10,
        retentionTime: 3600000
      },

      // Feature flags
      features: {
        enableYjs: false,
        enableReasoning: true,
        enableStreaming: true,
        enableTaskManagement: true,
        enableMockData: false
      },

      // Logging configuration
      logging: {
        level: 'info',
        enableTimestamps: true,
        enableComponentPrefix: true,
        maxLogLength: 1000
      },

      // Performance configuration
      performance: {
        enableMetrics: false,
        metricsInterval: 5000,
        enableProfiling: false,
        maxOperationTime: 10000
      }
    };
  }

  loadConfig(customConfig = {}) {
    this.config = this.mergeConfigs(this.defaultConfig, customConfig);
    this.validateConfig();
    this.applyConfig();
    return this.config;
  }

  mergeConfigs(baseConfig, overrides) {
    const merged = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    for (const [section, values] of Object.entries(overrides)) {
      if (merged[section] && typeof merged[section] === 'object') {
        merged[section] = { ...merged[section], ...values };
      } else {
        merged[section] = values;
      }
    }

    return merged;
  }

  validateConfig() {
    const errors = [];

    // Validate server config
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('Server port must be between 1 and 65535');
    }

    if (this.config.server.maxConnectionsPerIP < 1) {
      errors.push('Max connections per IP must be at least 1');
    }

    if (this.config.server.maxTotalConnections < this.config.server.maxConnectionsPerIP) {
      errors.push('Max total connections must be greater than max connections per IP');
    }

    // Validate WebSocket config
    if (this.config.websocket.heartbeatInterval < 1000) {
      errors.push('Heartbeat interval must be at least 1000ms');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  applyConfig() {
    // Apply logging configuration
    if (WebSocketUtils.Logger) {
      WebSocketUtils.Logger.setLogLevel(this.config.logging.level);
    }

    // Set environment variables for Yjs if enabled
    if (this.config.features.enableYjs) {
      process.env.ENABLE_YJS = 'true';
    }
  }

  getConfigValue(path, defaultValue = null) {
    return WebSocketUtils.getConfigValue(this.config, path, defaultValue);
  }

  getServerConfig() {
    return this.config.server;
  }

  getWebSocketConfig() {
    return this.config.websocket;
  }

  getFeaturesConfig() {
    return this.config.features;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getPerformanceConfig() {
    return this.config.performance;
  }

  updateConfig(updates) {
    this.config = this.mergeConfigs(this.config, updates);
    this.validateConfig();
    this.applyConfig();
    return this.config;
  }

  resetToDefaults() {
    this.config = { ...this.defaultConfig };
    this.applyConfig();
    return this.config;
  }

  exportConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  importConfig(configData) {
    try {
      const parsed = typeof configData === 'string' ? JSON.parse(configData) : configData;
      return this.loadConfig(parsed);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }

  // Utility methods for common configuration patterns
  getConnectionLimits() {
    return {
      maxPerIP: this.config.server.maxConnectionsPerIP,
      maxTotal: this.config.server.maxTotalConnections
    };
  }

  getHeartbeatSettings() {
    return {
      interval: this.config.websocket.heartbeatInterval,
      timeout: this.config.websocket.heartbeatInterval * this.config.websocket.clientTimeoutMultiplier
    };
  }

  getStreamSettings() {
    return {
      bufferSize: this.config.websocket.streamBufferSize,
      taskBufferSize: this.config.websocket.taskStreamBufferSize,
      historyLimit: this.config.websocket.taskHistoryLimit,
      retentionTime: this.config.websocket.retentionTime
    };
  }

  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }

  enableFeature(feature) {
    if (this.config.features.hasOwnProperty(feature)) {
      this.config.features[feature] = true;
      this.applyConfig();
    }
  }

  disableFeature(feature) {
    if (this.config.features.hasOwnProperty(feature)) {
      this.config.features[feature] = false;
      this.applyConfig();
    }
  }
}

export default ConfigManager;