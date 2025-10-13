/**
 * Common utility functions for UI components
 */

// Determine priority-based color
export const getPriorityColor = (priority) => {
  if (priority > 0.8) return '#dc3545'; // High: Red
  if (priority > 0.5) return '#ffc107'; // Medium: Yellow
  if (priority > 0.2) return '#28a745'; // Low: Green
  return '#6c757d'; // Very low: Gray
};

// Determine icon based on item type
export const getItemIcon = (type, defaultIcon = '📋') => {
  if (!type) return defaultIcon;
  
  const lowerType = type.toLowerCase();
  if (lowerType.includes('input')) return '📥';
  if (lowerType.includes('derived')) return '✨';
  if (lowerType.includes('goal')) return '🎯';
  if (lowerType.includes('question')) return '❓';
  if (lowerType.includes('operation')) return '⚙️';
  if (lowerType.includes('inference')) return '💭';
  return defaultIcon;
};

// Determine color based on log level
export const getLogLevelColor = (level) => {
  if (!level) return '#28a745';
  const lowerLevel = level.toLowerCase();
  if (lowerLevel.includes('error')) return '#dc3545';
  if (lowerLevel.includes('warn')) return '#ffc107';
  if (lowerLevel.includes('info')) return '#17a2b8';
  if (lowerLevel.includes('debug')) return '#6c757d';
  return '#28a745';
};

// Determine icon based on log message content
export const getLogIcon = (message) => {
  if (!message || typeof message !== 'string') return '🔹';
  
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('error')) return '❌';
  if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) return '⚠️';
  if (lowerMessage.includes('info')) return 'ℹ️';
  if (lowerMessage.includes('task')) return '📋';
  if (lowerMessage.includes('concept')) return '🧠';
  if (lowerMessage.includes('cycle')) return '🔄';
  if (lowerMessage.includes('goal')) return '🎯';
  if (lowerMessage.includes('question')) return '❓';
  if (lowerMessage.includes('inference')) return '💭';
  if (lowerMessage.includes('operation')) return '⚙️';
  return '🔹';
};

// Safe way to extract data from Yjs objects or regular objects
export const extractLogData = (log) => {
  // Check if log is a Yjs object (has get method) or a regular object
  const isYjsObject = log && typeof log.get === 'function';
  return isYjsObject ? log.get('data') : (log.data || log.message || JSON.stringify(log));
};

// Safe way to extract level from Yjs objects or regular objects
export const extractLogLevel = (log) => {
  const isYjsObject = log && typeof log.get === 'function';
  return isYjsObject ? log.get('level') : (log.level || 'info');
};