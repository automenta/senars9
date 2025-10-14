/**
 * @deprecated Use uiHelpers.js instead for new code
 * This file is kept for backward compatibility
 * Import from uiHelpers.js for better performance and maintainability
 */

import {
  getPriorityColor,
  getItemIcon,
  getLogLevelColor,
  getLogIcon,
  getConnectionStatusText,
  formatLogData,
  formatLogLevel,
  getStatusColor
} from './uiHelpers.js';

// Re-export utilities for backward compatibility
export {
  getPriorityColor,
  getItemIcon,
  getLogLevelColor,
  getLogIcon,
  getConnectionStatusText,
  formatLogData,
  formatLogLevel
};

// Legacy functions - use getStatusColor from uiHelpers instead
export const getConnectionStatusColor = getStatusColor;

// Legacy color function - use getStatusColor from uiHelpers instead
export const getConnectionStatusColorLegacy = (status) =>
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