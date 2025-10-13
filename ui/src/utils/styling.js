import { THEME } from '../constants';

// Theme builder for creating custom themes
export const createTheme = (overrides = {}) => ({
  ...THEME,
  ...overrides,
  colors: { ...THEME.colors, ...overrides.colors },
  spacing: { ...THEME.spacing, ...overrides.spacing },
  fontSize: { ...THEME.fontSize, ...overrides.fontSize },
  fontWeight: { ...THEME.fontWeight, ...overrides.fontWeight }
});

// Consolidated style builders for consistent theming
const createBaseStyle = (theme = THEME) => ({
  borderRadius: theme.borderRadius,
  fontFamily: theme.fontFamily || 'inherit'
});

const createInteractiveStyle = (theme = THEME) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': { opacity: 0.8 }
});

// Generic style builder with theme integration
export const applyTheme = (baseStyles, themeOverrides = {}) => {
  const theme = createTheme(themeOverrides);
  return { ...baseStyles, ...createBaseStyle(theme) };
};

// Component style factories with enhanced parameterization
export const createContainerStyle = (theme = THEME, overrides = {}) => {
  const config = {
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.gray[300]}`,
    backgroundColor: theme.colors.gray[100],
    ...createBaseStyle(theme),
    ...overrides
  };
  return config;
};

export const createHeaderStyle = (theme = THEME, overrides = {}) => {
  const config = {
    margin: '0 0 10px 0',
    color: theme.colors.dark,
    fontSize: theme.fontSize.sm,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    paddingBottom: theme.spacing.xs,
    ...overrides
  };
  return config;
};

export const createButtonStyle = (type = 'primary', theme = THEME, overrides = {}) => {
  const buttonTypes = {
    primary: { bg: theme.colors.primary, color: theme.colors.white },
    success: { bg: theme.colors.success, color: theme.colors.white },
    danger: { bg: theme.colors.danger, color: theme.colors.white },
    warning: { bg: theme.colors.warning, color: theme.colors.dark },
    info: { bg: theme.colors.info, color: theme.colors.white },
    secondary: { bg: theme.colors.gray[400], color: theme.colors.dark }
  };

  const typeStyle = buttonTypes[type] || buttonTypes.primary;

  return {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    border: 'none',
    backgroundColor: typeStyle.bg,
    color: typeStyle.color,
    ...createBaseStyle(theme),
    ...createInteractiveStyle(theme),
    ...overrides
  };
};

export const createInputStyle = (theme = THEME, overrides = {}) => {
  const config = {
    padding: theme.spacing.xs,
    border: `1px solid ${theme.colors.gray[400]}`,
    ...createBaseStyle(theme),
    ...overrides
  };
  return config;
};

export const createStatBoxStyle = (theme = THEME, overrides = {}) => {
  const config = {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.gray[200],
    textAlign: 'center',
    ...createBaseStyle(theme),
    ...overrides
  };
  return config;
};

export const createLabelStyle = (theme = THEME, overrides = {}) => {
  const config = {
    display: 'block',
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize.xs,
    ...overrides
  };
  return config;
};

export const createStatusBadgeStyle = (status, theme = THEME, overrides = {}) => {
  const statusMap = {
    connected: { bg: `${theme.colors.success}20`, color: theme.colors.success },
    connecting: { bg: `${theme.colors.warning}20`, color: theme.colors.warning },
    disconnected: { bg: `${theme.colors.danger}20`, color: theme.colors.danger },
    running: { bg: `${theme.colors.success}20`, color: theme.colors.success },
    paused: { bg: `${theme.colors.warning}20`, color: theme.colors.warning },
    stopped: { bg: `${theme.colors.danger}20`, color: theme.colors.danger }
  };

  const { bg, color } = statusMap[status] || { bg: `${theme.colors.gray[300]}20`, color: theme.colors.gray[600] };

  return {
    padding: `2px ${theme.spacing.md}`,
    backgroundColor: bg,
    color,
    borderRadius: '12px',
    fontSize: theme.fontSize.xs,
    ...overrides
  };
};

export const createGridStyle = (columns = 'repeat(auto-fit, minmax(200px, 1fr))', gap, theme = THEME) => {
  const config = {
    display: 'grid',
    gridTemplateColumns: columns,
    gap: gap || theme.spacing.md
  };
  return config;
};

// Enhanced style factory with variant support
export const createStyleFactory = (componentType) => {
  const factories = {
    container: createContainerStyle,
    header: createHeaderStyle,
    button: createButtonStyle,
    input: createInputStyle,
    statBox: createStatBoxStyle,
    label: createLabelStyle,
    statusBadge: createStatusBadgeStyle,
    grid: createGridStyle
  };

  return (theme, ...args) => factories[componentType]?.(theme, ...args) || {};
};

// Theme-aware style composition
export const composeThemedStyles = (theme, ...styleConfigs) => {
  const themeObj = createTheme(theme);
  return styleConfigs.reduce((acc, config) => {
    if (typeof config === 'function') {
      return { ...acc, ...config(themeObj) };
    }
    return { ...acc, ...config };
  }, {});
};

// Responsive style utilities
export const createResponsiveStyle = (breakpoints, theme = THEME) => {
  const styles = {};
  Object.entries(breakpoints).forEach(([breakpoint, style]) => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia(`(max-width: ${breakpoint})`);
      if (mediaQuery.matches) {
        Object.assign(styles, style);
      }
    }
  });
  return styles;
};

// Animation utilities
export const createAnimationStyle = (animationType, duration = '0.2s', easing = 'ease') => {
  const animations = {
    fadeIn: { opacity: 0, animation: `fadeIn ${duration} ${easing}` },
    slideIn: { transform: 'translateX(-100%)', animation: `slideIn ${duration} ${easing}` },
    scaleIn: { transform: 'scale(0)', animation: `scaleIn ${duration} ${easing}` }
  };

  return animations[animationType] || {};
};

// Backward compatibility aliases
export const panelContainerStyle = (overrides) => createContainerStyle(THEME, overrides);
export const headerStyle = (overrides) => createHeaderStyle(THEME, overrides);
export const buttonStyle = (type, overrides) => createButtonStyle(type, THEME, overrides);
export const inputStyle = (overrides) => createInputStyle(THEME, overrides);
export const statBoxStyle = (overrides) => createStatBoxStyle(THEME, overrides);
export const labelStyle = (overrides) => createLabelStyle(THEME, overrides);
export const statusBadgeStyle = (status, overrides) => createStatusBadgeStyle(status, THEME, overrides);
export const gridStyle = (columns, gap) => createGridStyle(columns, gap, THEME);