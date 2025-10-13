// Common component patterns and abstractions for DRY code

import { getPriorityColor, getItemIcon } from './common';
import { createButtonStyle, createContainerStyle } from './styling';

// Generic empty state component pattern
export const createEmptyState = (icon, title, subtitle, style = {}) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#999',
  fontStyle: 'italic',
  textAlign: 'center',
  ...style,
  content: {
    icon: { fontSize: '24px', marginBottom: '10px' },
    title: { margin: 0 },
    subtitle: { fontSize: '10px', marginTop: '5px' }
  }
});

// Task item styling patterns
export const createTaskItemStyle = (isExpanded, isDragging, priority) => {
  const base = {
    padding: '6px 8px',
    margin: '2px 0',
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    minHeight: '36px'
  };

  const states = {
    expanded: {
      backgroundColor: '#e7f1ff',
      border: '1px solid #0d6efd'
    },
    collapsed: {
      backgroundColor: '#f8f9fa',
      border: '1px solid #ced4da'
    }
  };

  return {
    ...base,
    ...(isExpanded ? states.expanded : states.collapsed),
    opacity: isDragging ? 0.5 : 1
  };
};

// Priority indicator styling
export const createPriorityIndicatorStyle = (priority) => {
  const color = getPriorityColor(priority);
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: `${color}20`,
    marginRight: '8px',
    fontSize: '12px',
    color
  };
};

// Task content styling
export const createTaskContentStyle = () => ({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  title: {
    fontWeight: '500',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
});

// Task controls styling
export const createTaskControlsStyle = () => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: '120px',
  justifyContent: 'flex-end',
  priority: {
    fontWeight: 'bold',
    fontSize: '11px',
    minWidth: '30px',
    textAlign: 'right'
  },
  slider: {
    width: '40px',
    cursor: 'ew-resize',
    height: '16px'
  },
  toggle: {
    padding: '2px 6px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  }
});

// Panel header styling
export const createPanelHeaderStyle = (title, count, style = {}) => ({
  padding: '5px 10px',
  backgroundColor: '#e9ecef',
  borderBottom: '1px solid #ccc',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  ...style,
  title: { margin: 0 },
  count: { color: '#666' }
});

// Expanded task details styling
export const createTaskDetailsStyle = () => ({
  position: 'absolute',
  left: '0',
  right: '0',
  top: '100%',
  backgroundColor: 'white',
  border: '1px solid #0d6efd',
  borderRadius: '4px',
  padding: '10px',
  zIndex: 20,
  marginTop: '2px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  fontSize: '11px',
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    title: { margin: 0, color: '#0d6efd' },
    close: {
      background: 'none',
      border: 'none',
      fontSize: '14px',
      cursor: 'pointer',
      color: '#6c757d'
    }
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  actions: {
    marginTop: '10px',
    display: 'flex',
    gap: '8px',
    button: {
      padding: '4px 8px',
      fontSize: '10px',
      border: '1px solid #ccc',
      borderRadius: '3px',
      cursor: 'pointer',
      backgroundColor: '#e9ecef'
    }
  }
});

// Generic button group styling
export const createButtonGroupStyle = (buttons, gap = '8px') => ({
  display: 'flex',
  gap,
  ...buttons.reduce((acc, btn, i) => ({
    ...acc,
    [`button${i}`]: btn.style || {}
  }), {})
});

// Scrollable container pattern
export const createScrollableContainerStyle = (style = {}) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '8px',
  position: 'relative',
  ...style
});

// Generic list container pattern
export const createListContainerStyle = (style = {}) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  ...style
});

// Event handler abstractions
export const createEventHandlers = (handlers) => ({
  onClick: handlers.onClick || (() => {}),
  onChange: handlers.onChange || (() => {}),
  onDelete: handlers.onDelete || (() => {}),
  onUpdate: handlers.onUpdate || (() => {}),
  onToggle: handlers.onToggle || (() => {})
});

// Style composition utility
export const composeStyles = (...styles) =>
  styles.reduce((acc, style) => ({ ...acc, ...style }), {});

// Conditional style application
export const applyConditionalStyles = (condition, trueStyle, falseStyle = {}) =>
  condition ? { ...falseStyle, ...trueStyle } : falseStyle;