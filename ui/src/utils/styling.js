import { THEME } from '../constants';
import {
  createPanelStyle,
  createHeaderStyle,
  createContentStyle,
  createButtonStyle,
  createBadgeStyle,
  createGridLayout,
  createFlexLayout
} from './uiHelpers';

// Re-export consolidated styles using uiHelpers patterns
export const applyTheme = (baseStyles, themeOverrides = {}) => ({ ...baseStyles, borderRadius: { ...THEME, ...themeOverrides }.borderRadius });

export const panelContainerStyle = (overrides = {}) => createPanelStyle({ padding: THEME.spacing.md, backgroundColor: THEME.colors.gray[100], ...overrides });

export const headerStyle = (overrides = {}) => createHeaderStyle({ margin: '0 0 10px 0', fontSize: THEME.fontSize.sm, ...overrides });

export const buttonStyle = (type = 'primary', overrides = {}) => createButtonStyle(type, { fontSize: THEME.fontSize.xs, ...overrides });

export const inputStyle = (overrides = {}) => ({ padding: THEME.spacing.xs, border: `1px solid ${THEME.colors.gray[400]}`, borderRadius: THEME.borderRadius, ...overrides });

export const statBoxStyle = (overrides = {}) => ({ padding: THEME.spacing.sm, backgroundColor: THEME.colors.gray[200], borderRadius: THEME.borderRadius, textAlign: 'center', ...overrides });

export const labelStyle = (overrides = {}) => ({ display: 'block', marginBottom: THEME.spacing.xs, fontWeight: THEME.fontWeight.bold, fontSize: THEME.fontSize.xs, ...overrides });

export const statusBadgeStyle = (status, overrides = {}) => {
  const color = THEME.colors[status] || THEME.colors.gray[600];
  return createBadgeStyle(color, { padding: `2px ${THEME.spacing.md}`, fontSize: THEME.fontSize.xs, ...overrides });
};

export const gridStyle = (columns = 'repeat(auto-fit, minmax(200px, 1fr))', gap = THEME.spacing.md) => createGridLayout(columns, gap);