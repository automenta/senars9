export const getPriorityColor = (priority) =>
  priority > 0.8 ? '#dc3545' :  // High: Red
  priority > 0.5 ? '#ffc107' :  // Medium: Yellow
  priority > 0.2 ? '#28a745' :  // Low: Green
  '#6c757d';                    // Very low: Gray

export const getItemIcon = (type, defaultIcon = '📋') => {
  if (!type) return defaultIcon;
  
  const lowerType = type.toLowerCase();
  return lowerType.includes('input') ? '📥' :
         lowerType.includes('derived') ? '✨' :
         lowerType.includes('goal') ? '🎯' :
         lowerType.includes('question') ? '❓' :
         lowerType.includes('operation') ? '⚙️' :
         lowerType.includes('inference') ? '💭' :
         defaultIcon;
};

export const getLogLevelColor = (level) => {
  if (!level) return '#28a745';
  const lowerLevel = level.toLowerCase();
  return lowerLevel.includes('error') ? '#dc3545' :
         lowerLevel.includes('warn') ? '#ffc107' :
         lowerLevel.includes('info') ? '#17a2b8' :
         lowerLevel.includes('debug') ? '#6c757d' :
         '#28a745';
};

export const getLogIcon = (message) => {
  if (!message || typeof message !== 'string') return '🔹';
  
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('error') ? '❌' :
         lowerMessage.includes('warning') || lowerMessage.includes('warn') ? '⚠️' :
         lowerMessage.includes('info') ? 'ℹ️' :
         lowerMessage.includes('task') ? '📋' :
         lowerMessage.includes('concept') ? '🧠' :
         lowerMessage.includes('cycle') ? '🔄' :
         lowerMessage.includes('goal') ? '🎯' :
         lowerMessage.includes('question') ? '❓' :
         lowerMessage.includes('inference') ? '💭' :
         lowerMessage.includes('operation') ? '⚙️' :
         '🔹';
};

export const getConnectionStatusText = (status) => 
  status === 'connected' ? 'Connected' :
  status === 'connecting' ? 'Connecting...' :
  status === 'reconnecting' ? 'Reconnecting...' :
  'Disconnected';

export const getConnectionStatusColor = (status) => 
  status === 'connected' ? '#28a745' :      // green for connected
  ['connecting', 'reconnecting'].includes(status) ? '#ffc107' :  // yellow for connecting
  status === 'disconnected' ? '#dc3545' :   // red for disconnected
  '#6c757d';  // default color for unknown status

export const getConnectionStatusColorForTheme = (status, theme) => 
  status === 'connected' ? theme.colors.success :
  ['connecting', 'reconnecting'].includes(status) ? theme.colors.warning :
  status === 'disconnected' ? theme.colors.danger :
  theme.colors.gray[600];

export const getConnectionStatusStyle = (status, theme) => ({
  padding: theme.spacing.sm,
  marginBottom: theme.spacing.md,
  borderRadius: theme.borderRadius,
  color: theme.colors.white,
  fontWeight: theme.fontWeight.bold,
  backgroundColor: getConnectionStatusColorForTheme(status, theme)
});

export const extractLogData = (log) => {
  // Check if log is a Yjs object (has get method) or a regular object
  const isYjsObject = log && typeof log.get === 'function';
  return isYjsObject ? log.get('data') : (log.data || log.message || JSON.stringify(log));
};

export const extractLogLevel = (log) => {
  const isYjsObject = log && typeof log.get === 'function';
  return isYjsObject ? log.get('level') : (log.level || 'info');
};