// Consolidated mapping utilities for consistent styling
const STATUS_MAPPINGS = {
  priority: {
    ranges: [0.8, 0.5, 0.2],
    values: ['#dc3545', '#ffc107', '#28a745', '#6c757d']
  },
  logLevel: {
    patterns: ['error', 'warn', 'info', 'debug'],
    values: ['#dc3545', '#ffc107', '#17a2b8', '#6c757d', '#28a745']
  },
  connection: {
    states: ['connected', 'connecting', 'reconnecting', 'disconnected'],
    values: ['#28a745', '#ffc107', '#ffc107', '#dc3545', '#6c757d'],
    texts: ['Connected', 'Connecting...', 'Reconnecting...', 'Disconnected', 'Unknown']
  }
};

const ICON_MAPPINGS = {
  item: {
    patterns: ['input', 'derived', 'goal', 'question', 'operation', 'inference'],
    values: ['📥', '✨', '🎯', '❓', '⚙️', '💭', '📋']
  },
  log: {
    patterns: ['error', 'warning', 'warn', 'info', 'task', 'concept', 'cycle', 'goal', 'question', 'inference', 'operation'],
    values: ['❌', '⚠️', '⚠️', 'ℹ️', '📋', '🧠', '🔄', '🎯', '❓', '💭', '⚙️', '🔹']
  }
};

// Generic mapping function for consistent lookups
const getMappedValue = (value, mapping, defaultValue) => {
  if (!value) return defaultValue;

  const lowerValue = value.toLowerCase();
  const { patterns, values } = mapping;

  for (let i = 0; i < patterns.length; i++) {
    if (lowerValue.includes(patterns[i])) return values[i];
  }

  return values[values.length - 1] || defaultValue;
};

// Priority color mapping with threshold logic
export const getPriorityColor = (priority) => {
  const { ranges, values } = STATUS_MAPPINGS.priority;
  const thresholds = [0, ...ranges];

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (priority > thresholds[i]) return values[i];
  }

  return values[values.length - 1];
};

// Icon mapping functions using consolidated logic
export const getItemIcon = (type, defaultIcon = '📋') =>
  getMappedValue(type, ICON_MAPPINGS.item, defaultIcon);

export const getLogIcon = (message) =>
  getMappedValue(message, ICON_MAPPINGS.log, '🔹');

// Status mapping functions
export const getConnectionStatusText = (status) =>
  STATUS_MAPPINGS.connection.texts[
    STATUS_MAPPINGS.connection.states.indexOf(status) || STATUS_MAPPINGS.connection.states.length - 1
  ] || 'Unknown';

export const getConnectionStatusColor = (status) =>
  STATUS_MAPPINGS.connection.values[
    STATUS_MAPPINGS.connection.states.indexOf(status) || STATUS_MAPPINGS.connection.states.length - 1
  ] || STATUS_MAPPINGS.connection.values[STATUS_MAPPINGS.connection.values.length - 1];

export const getConnectionStatusColorForTheme = (status, theme) => {
  const colorMap = {
    connected: theme.colors.success,
    connecting: theme.colors.warning,
    reconnecting: theme.colors.warning,
    disconnected: theme.colors.danger
  };
  return colorMap[status] || theme.colors.gray[600];
};

export const getConnectionStatusStyle = (status, theme) => ({
  padding: theme.spacing.sm,
  marginBottom: theme.spacing.md,
  borderRadius: theme.borderRadius,
  color: theme.colors.white,
  fontWeight: theme.fontWeight.bold,
  backgroundColor: getConnectionStatusColorForTheme(status, theme)
});

// Log level color mapping
export const getLogLevelColor = (level) =>
  getMappedValue(level, STATUS_MAPPINGS.logLevel, '#28a745');

// Yjs object extraction utilities
export const extractLogData = (log) => {
  if (!log) return '';
  const isYjsObject = typeof log.get === 'function';
  return isYjsObject ? log.get('data') : (log.data || log.message || JSON.stringify(log));
};

export const extractLogLevel = (log) => {
  if (!log) return 'info';
  const isYjsObject = typeof log.get === 'function';
  return isYjsObject ? log.get('level') : (log.level || 'info');
};