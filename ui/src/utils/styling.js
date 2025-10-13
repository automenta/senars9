import { THEME } from '../constants';

// Core style abstractions
const createBaseStyle = (theme = THEME) => ({
  borderRadius: theme.borderRadius,
  fontFamily: theme.fontFamily || 'inherit'
});

const createInteractiveStyle = (theme = THEME) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': { opacity: 0.8 }
});

// Theme management
export const createTheme = (overrides = {}) => ({
  ...THEME,
  ...overrides,
  colors: { ...THEME.colors, ...overrides.colors },
  spacing: { ...THEME.spacing, ...overrides.spacing },
  fontSize: { ...THEME.fontSize, ...overrides.fontSize },
  fontWeight: { ...THEME.fontWeight, ...overrides.fontWeight }
});

// Generic style builder with theme integration
export const applyTheme = (baseStyles, themeOverrides = {}) => {
  const theme = createTheme(themeOverrides);
  return { ...baseStyles, ...createBaseStyle(theme) };
};

// Component style factories - consolidated and parameterized
export const createStyle = (componentType, variant = 'default', theme = THEME, overrides = {}) => {
  const factories = {
    container: () => ({
      padding: theme.spacing.md,
      border: `1px solid ${theme.colors.gray[300]}`,
      backgroundColor: theme.colors.gray[100],
      ...createBaseStyle(theme),
      ...overrides
    }),

    header: () => ({
      margin: '0 0 10px 0',
      color: theme.colors.dark,
      fontSize: theme.fontSize.sm,
      borderBottom: `1px solid ${theme.colors.gray[200]}`,
      paddingBottom: theme.spacing.xs,
      ...overrides
    }),

    button: () => {
      const buttonTypes = {
        primary: { bg: theme.colors.primary, color: theme.colors.white },
        success: { bg: theme.colors.success, color: theme.colors.white },
        danger: { bg: theme.colors.danger, color: theme.colors.white },
        warning: { bg: theme.colors.warning, color: theme.colors.dark },
        info: { bg: theme.colors.info, color: theme.colors.white },
        secondary: { bg: theme.colors.gray[400], color: theme.colors.dark }
      };

      const typeStyle = buttonTypes[variant] || buttonTypes.primary;

      return {
        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
        border: 'none',
        backgroundColor: typeStyle.bg,
        color: typeStyle.color,
        ...createBaseStyle(theme),
        ...createInteractiveStyle(theme),
        ...overrides
      };
    },

    input: () => ({
      padding: theme.spacing.xs,
      border: `1px solid ${theme.colors.gray[400]}`,
      ...createBaseStyle(theme),
      ...overrides
    }),

    panel: () => ({
      border: `1px solid ${theme.colors.gray[300]}`,
      borderRadius: theme.borderRadius,
      backgroundColor: theme.colors.white,
      marginBottom: theme.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      ...overrides
    }),

    badge: () => {
      const statusMap = {
        connected: { bg: `${theme.colors.success}20`, color: theme.colors.success },
        connecting: { bg: `${theme.colors.warning}20`, color: theme.colors.warning },
        disconnected: { bg: `${theme.colors.danger}20`, color: theme.colors.danger },
        running: { bg: `${theme.colors.success}20`, color: theme.colors.success },
        paused: { bg: `${theme.colors.warning}20`, color: theme.colors.warning },
        stopped: { bg: `${theme.colors.danger}20`, color: theme.colors.danger }
      };

      const { bg, color } = statusMap[variant] || { bg: `${theme.colors.gray[300]}20`, color: theme.colors.gray[600] };

      return {
        padding: `2px ${theme.spacing.md}`,
        backgroundColor: bg,
        color,
        borderRadius: '12px',
        fontSize: theme.fontSize.xs,
        ...overrides
      };
    },

    grid: () => ({
      display: 'grid',
      gridTemplateColumns: overrides.columns || 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: overrides.gap || theme.spacing.md
    })
  };

  return factories[componentType]?.() || {};
};

// Layout utilities
export const createLayout = (type, config = {}) => {
  const layouts = {
    flex: (cfg) => ({
      display: 'flex',
      flexDirection: cfg.direction || 'row',
      justifyContent: cfg.justify || 'flex-start',
      alignItems: cfg.align || 'stretch',
      gap: cfg.gap || 0,
      ...cfg.overrides
    }),

    grid: (cfg) => ({
      display: 'grid',
      gridTemplateColumns: cfg.columns || '1fr',
      gridTemplateRows: cfg.rows || 'auto',
      gap: cfg.gap || theme.spacing.md,
      ...cfg.overrides
    }),

    stack: (cfg) => ({
      display: 'flex',
      flexDirection: 'column',
      gap: cfg.gap || 0,
      ...cfg.overrides
    })
  };

  return layouts[type]?.(config) || {};
};

// Animation utilities
export const createAnimation = (type, duration = '0.2s', easing = 'ease') => {
  const animations = {
    fadeIn: { opacity: 0, animation: `fadeIn ${duration} ${easing}` },
    slideIn: { transform: 'translateX(-100%)', animation: `slideIn ${duration} ${easing}` },
    scaleIn: { transform: 'scale(0)', animation: `scaleIn ${duration} ${easing}` },
    spin: {
      animation: `spin ${duration} ${easing}`,
      transformOrigin: 'center'
    }
  };

  return animations[type] || {};
};

// Responsive utilities
export const createResponsive = (breakpoints, theme = THEME) => {
  const styles = {};
  if (typeof window !== 'undefined') {
    Object.entries(breakpoints).forEach(([breakpoint, style]) => {
      const mediaQuery = window.matchMedia(`(max-width: ${breakpoint})`);
      if (mediaQuery.matches) {
        Object.assign(styles, style);
      }
    });
  }
  return styles;
};

// Style composition utilities
export const composeStyles = (...styleConfigs) =>
  styleConfigs.reduce((acc, config) => ({ ...acc, ...config }), {});

export const conditionalStyles = (condition, trueStyle, falseStyle = {}) =>
  condition ? { ...falseStyle, ...trueStyle } : falseStyle;

// Backward compatibility aliases
export const createContainerStyle = (theme, overrides) => createStyle('container', 'default', theme, overrides);
export const createHeaderStyle = (theme, overrides) => createStyle('header', 'default', theme, overrides);
export const createButtonStyle = (type, theme, overrides) => createStyle('button', type, theme, overrides);
export const createInputStyle = (theme, overrides) => createStyle('input', 'default', theme, overrides);
export const createStatusBadgeStyle = (status, theme, overrides) => createStyle('badge', status, theme, overrides);
export const createGridStyle = (columns, gap, theme) => createStyle('grid', 'default', theme, { columns, gap });

// Legacy function-style aliases for backward compatibility
export const panelContainerStyle = (overrides) => createStyle('panel', 'default', THEME, overrides);
export const headerStyle = (overrides) => createStyle('header', 'default', THEME, overrides);
export const labelStyle = (overrides) => createStyle('label', 'default', THEME, overrides);
export const buttonStyle = (type, overrides) => createStyle('button', type, THEME, overrides);
export const inputStyle = (overrides) => createStyle('input', 'default', THEME, overrides);
export const statBoxStyle = (overrides) => createStyle('statBox', 'default', THEME, overrides);
export const statusBadgeStyle = (status, overrides) => createStyle('badge', status, THEME, overrides);

// Enhanced style factory
export const createStyleFactory = (componentType) => (variant, theme, ...args) =>
  createStyle(componentType, variant, theme, ...args);