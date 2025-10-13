/**
 * Styling utilities for consistent theming across components
 */

import { THEME } from '../constants';

/**
 * Applies theme values to style objects
 */
export const applyTheme = (baseStyles, themeOverrides = {}) => {
  const theme = { ...THEME, ...themeOverrides };
  
  return {
    ...baseStyles,
    borderRadius: theme.borderRadius,
  };
};

/**
 * Creates a standard panel container style
 */
export const panelContainerStyle = (overrides = {}) => ({
  padding: THEME.spacing.md,
  border: `1px solid ${THEME.colors.gray[300]}`,
  borderRadius: THEME.borderRadius,
  backgroundColor: THEME.colors.gray[100],
  ...overrides
});

/**
 * Creates a standard header style
 */
export const headerStyle = (overrides = {}) => ({
  margin: '0 0 10px 0',
  color: THEME.colors.dark,
  fontSize: THEME.fontSize.sm,
  borderBottom: `1px solid ${THEME.colors.gray[200]}`,
  paddingBottom: THEME.spacing.xs,
  ...overrides
});

/**
 * Creates a standard button style
 */
export const buttonStyle = (type = 'primary', overrides = {}) => {
  const base = {
    padding: `${THEME.spacing.xs} ${THEME.spacing.md}`,
    border: 'none',
    borderRadius: THEME.borderRadius,
    cursor: 'pointer',
    fontSize: THEME.fontSize.xs,
  };

  const typeStyles = {
    primary: { backgroundColor: THEME.colors.primary, color: THEME.colors.white },
    success: { backgroundColor: THEME.colors.success, color: THEME.colors.white },
    danger: { backgroundColor: THEME.colors.danger, color: THEME.colors.white },
    warning: { backgroundColor: THEME.colors.warning, color: THEME.colors.dark },
    info: { backgroundColor: THEME.colors.info, color: THEME.colors.white },
    secondary: { backgroundColor: THEME.colors.gray[400], color: THEME.colors.dark },
  };

  return {
    ...base,
    ...typeStyles[type] || typeStyles.primary,
    ...overrides
  };
};

/**
 * Creates a standard input field style
 */
export const inputStyle = (overrides = {}) => ({
  padding: THEME.spacing.xs,
  border: `1px solid ${THEME.colors.gray[400]}`,
  borderRadius: THEME.borderRadius,
  ...overrides
});

/**
 * Creates a standard stat box style
 */
export const statBoxStyle = (overrides = {}) => ({
  padding: THEME.spacing.sm,
  backgroundColor: THEME.colors.gray[200],
  borderRadius: THEME.borderRadius,
  textAlign: 'center',
  ...overrides
});

/**
 * Creates a standard label style
 */
export const labelStyle = (overrides = {}) => ({
  display: 'block',
  marginBottom: THEME.spacing.xs,
  fontWeight: THEME.fontWeight.bold,
  fontSize: THEME.fontSize.xs,
  ...overrides
});

/**
 * Creates a standard status badge style
 */
export const statusBadgeStyle = (status, overrides = {}) => {
  const statusColors = {
    connected: { bg: THEME.colors.success + '20', color: THEME.colors.success },
    connecting: { bg: THEME.colors.warning + '20', color: THEME.colors.warning },
    disconnected: { bg: THEME.colors.danger + '20', color: THEME.colors.danger },
    running: { bg: THEME.colors.success + '20', color: THEME.colors.success },
    paused: { bg: THEME.colors.warning + '20', color: THEME.colors.warning },
    stopped: { bg: THEME.colors.danger + '20', color: THEME.colors.danger },
  };

  const colors = statusColors[status] || { bg: THEME.colors.gray[300] + '20', color: THEME.colors.gray[600] };

  return {
    padding: `2px ${THEME.spacing.md}`,
    backgroundColor: colors.bg,
    color: colors.color,
    borderRadius: '12px',
    fontSize: THEME.fontSize.xs,
    ...overrides
  };
};

/**
 * Creates grid layout styles
 */
export const gridStyle = (columns = 'repeat(auto-fit, minmax(200px, 1fr))', gap = THEME.spacing.md) => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: gap
});