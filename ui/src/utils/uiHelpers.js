import { THEME } from '../constants';

// Color and styling utilities
export const getPriorityColor = (priority) =>
  priority > 0.8 ? THEME.colors.danger :
  priority > 0.5 ? THEME.colors.warning :
  priority > 0.2 ? THEME.colors.success :
  THEME.colors.gray[600];

export const getStatusColor = (status) => {
  const statusMap = {
    connected: THEME.colors.success,
    connecting: THEME.colors.warning,
    disconnected: THEME.colors.danger,
    running: THEME.colors.success,
    paused: THEME.colors.warning,
    stopped: THEME.colors.danger,
    error: THEME.colors.danger
  };
  return statusMap[status] || THEME.colors.gray[600];
};

export const getLogLevelColor = (level) => {
  const levelMap = {
    error: THEME.colors.danger,
    warn: THEME.colors.warning,
    info: THEME.colors.info,
    debug: THEME.colors.gray[600]
  };
  return levelMap[level] || THEME.colors.success;
};

// Icon utilities
export const getItemIcon = (type, defaultIcon = '📋') => {
  if (!type) return defaultIcon;

  const iconMap = {
    input: '📥',
    derived: '✨',
    goal: '🎯',
    question: '❓',
    operation: '⚙️',
    inference: '💭'
  };

  return iconMap[type.toLowerCase()] || defaultIcon;
};

export const getLogIcon = (message) => {
  if (!message || typeof message !== 'string') return '🔹';

  const iconMap = {
    error: '❌',
    warning: '⚠️',
    warn: '⚠️',
    info: 'ℹ️',
    task: '📋',
    concept: '🧠',
    cycle: '🔄',
    goal: '🎯',
    question: '❓',
    inference: '💭',
    operation: '⚙️'
  };

  const messageLower = message.toLowerCase();
  return iconMap[Object.keys(iconMap).find(key => messageLower.includes(key))] || '🔹';
};

// Text utilities
export const getConnectionStatusText = (status) => {
  const statusMap = {
    connected: 'Connected',
    connecting: 'Connecting...',
    reconnecting: 'Reconnecting...',
    disconnected: 'Disconnected'
  };
  return statusMap[status] || 'Unknown';
};

export const formatLogData = (log) => {
  const isYjsObject = log && typeof log.get === 'function';
  return isYjsObject ? log.get('data') : (log.data || log.message || JSON.stringify(log));
};

export const formatLogLevel = (log) => {
  const isYjsObject = log && typeof log.get === 'function';
  return isYjsObject ? log.get('level') : (log.level || 'info');
};

// Style utilities
export const createPanelStyle = (overrides = {}) => ({
  border: `1px solid ${THEME.colors.gray[300]}`,
  borderRadius: THEME.borderRadius,
  backgroundColor: THEME.colors.white,
  marginBottom: THEME.spacing.md,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  ...overrides
});

export const createHeaderStyle = (overrides = {}) => ({
  padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
  backgroundColor: THEME.colors.gray[100],
  borderBottom: `1px solid ${THEME.colors.gray[300]}`,
  fontWeight: THEME.fontWeight.bold,
  fontSize: THEME.fontSize.md,
  color: THEME.colors.dark,
  ...overrides
});

export const createContentStyle = (overrides = {}) => ({
  padding: THEME.spacing.md,
  flex: 1,
  overflowY: 'auto',
  ...overrides
});

export const createBadgeStyle = (color, overrides = {}) => ({
  padding: `2px ${THEME.spacing.sm}`,
  backgroundColor: `${color}20`,
  color: color,
  borderRadius: '12px',
  fontSize: THEME.fontSize.xs,
  fontWeight: THEME.fontWeight.bold,
  display: 'inline-block',
  ...overrides
});

export const createButtonStyle = (variant = 'primary', overrides = {}) => {
  const base = {
    padding: `${THEME.spacing.xs} ${THEME.spacing.md}`,
    border: 'none',
    borderRadius: THEME.borderRadius,
    cursor: 'pointer',
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    transition: 'all 0.2s ease'
  };

  const variants = {
    primary: { backgroundColor: THEME.colors.primary, color: THEME.colors.white },
    success: { backgroundColor: THEME.colors.success, color: THEME.colors.white },
    danger: { backgroundColor: THEME.colors.danger, color: THEME.colors.white },
    warning: { backgroundColor: THEME.colors.warning, color: THEME.colors.dark },
    info: { backgroundColor: THEME.colors.info, color: THEME.colors.white },
    secondary: { backgroundColor: THEME.colors.gray[400], color: THEME.colors.dark }
  };

  return {
    ...base,
    ...variants[variant],
    ...overrides
  };
};

export const createLabelStyle = (overrides = {}) => ({
  display: 'block',
  marginBottom: THEME.spacing.xs,
  fontWeight: THEME.fontWeight.bold,
  fontSize: THEME.fontSize.xs,
  ...overrides
});

export const createInputStyle = (overrides = {}) => ({
  padding: THEME.spacing.xs,
  border: `1px solid ${THEME.colors.gray[400]}`,
  borderRadius: THEME.borderRadius,
  ...overrides
});

export const createStatBoxStyle = (overrides = {}) => ({
  padding: THEME.spacing.sm,
  backgroundColor: THEME.colors.gray[200],
  borderRadius: THEME.borderRadius,
  textAlign: 'center',
  ...overrides
});

// Layout utilities
export const createGridLayout = (columns = 'repeat(auto-fit, minmax(200px, 1fr))', gap = THEME.spacing.md) => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: gap
});

export const createFlexLayout = (direction = 'row', justify = 'flex-start', align = 'stretch', overrides = {}) => ({
  display: 'flex',
  flexDirection: direction,
  justifyContent: justify,
  alignItems: align,
  ...overrides
});

// Animation utilities
export const fadeIn = {
  animation: 'fadeIn 0.3s ease-in-out'
};

export const slideIn = {
  animation: 'slideIn 0.3s ease-in-out'
};

// Responsive utilities
export const responsive = {
  mobile: '@media (max-width: 768px)',
  tablet: '@media (min-width: 769px) and (max-width: 1024px)',
  desktop: '@media (min-width: 1025px)'
};