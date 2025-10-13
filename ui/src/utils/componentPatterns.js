// Common component patterns and abstractions for DRY code

import { getPriorityColor } from './common';
import { createStyle, createLayout, composeStyles, conditionalStyles } from './styling';

// Generic empty state pattern
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

// Task item patterns using consolidated styling
export const createTaskItemStyle = (isExpanded, isDragging, priority) => {
  const base = createLayout('flex', {
    direction: 'row',
    align: 'center',
    gap: '8px',
    overrides: {
      padding: '6px 8px',
      margin: '2px 0',
      fontSize: '12px',
      cursor: 'grab',
      transition: 'all 0.2s ease',
      minHeight: '36px'
    }
  });

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

  return composeStyles(
    base,
    isExpanded ? states.expanded : states.collapsed,
    conditionalStyles(isDragging, { opacity: 0.5 })
  );
};

// Priority indicator using consolidated styling
export const createPriorityIndicatorStyle = (priority) => {
  const color = getPriorityColor(priority);
  return createStyle('container', 'default', null, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: `${color}20`,
    marginRight: '8px',
    fontSize: '12px',
    color,
    padding: 0,
    border: 'none'
  });
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

// Task controls using layout utilities
export const createTaskControlsStyle = () => createLayout('flex', {
  align: 'center',
  justify: 'flex-end',
  gap: '6px',
  overrides: {
    minWidth: '120px',
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
  }
});

// Panel header using consolidated styling
export const createPanelHeaderStyle = (title, count, style = {}) =>
  composeStyles(
    createLayout('flex', {
      justify: 'space-between',
      align: 'center',
      overrides: {
        padding: '5px 10px',
        backgroundColor: '#e9ecef',
        borderBottom: '1px solid #ccc',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    }),
    style,
    {
      title: { margin: 0 },
      count: { color: '#666' }
    }
  );

// Expanded task details - simplified and consolidated
export const createTaskDetailsStyle = () => {
  const base = {
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
    fontSize: '11px'
  };

  return {
    ...base,
    header: createLayout('flex', {
      justify: 'space-between',
      align: 'center',
      overrides: { marginBottom: '8px' }
    }),
    grid: createLayout('grid', { columns: '1fr 1fr', gap: '8px' }),
    actions: createLayout('flex', { gap: '8px', overrides: { marginTop: '10px' } })
  };
};

// Button group using layout utilities
export const createButtonGroupStyle = (buttons, gap = '8px') =>
  createLayout('flex', {
    gap,
    overrides: buttons.reduce((acc, btn, i) => ({
      ...acc,
      [`button${i}`]: btn.style || {}
    }), {})
  });

// Scrollable container pattern
export const createScrollableContainerStyle = (style = {}) =>
  composeStyles(
    createLayout('flex', {
      direction: 'column',
      overrides: { flex: 1, overflowY: 'auto', padding: '8px', position: 'relative' }
    }),
    style
  );

// List container pattern
export const createListContainerStyle = (style = {}) =>
  composeStyles(
    createLayout('flex', {
      direction: 'column',
      overrides: { height: '100%' }
    }),
    style
  );

// Event handler abstractions
export const createEventHandlers = (handlers) => ({
  onClick: handlers.onClick || (() => {}),
  onChange: handlers.onChange || (() => {}),
  onDelete: handlers.onDelete || (() => {}),
  onUpdate: handlers.onUpdate || (() => {}),
  onToggle: handlers.onToggle || (() => {})
});

// Style composition utility (now imported from styling.js)
// Conditional style application (now imported from styling.js)