import React, { useState } from 'react';
import { createStyle, createLayout } from '../utils/styling';

const Panel = ({
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  onToggle = null,
  headerStyle = {},
  contentStyle = {},
  panelStyle = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  const defaultPanelStyle = createStyle('panel');
  const defaultHeaderStyle = createLayout('flex', {
    align: 'center',
    overrides: {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      fontWeight: 'bold',
      fontSize: '16px',
      color: '#2c3e50',
      ...(collapsible && { cursor: 'pointer' })
    }
  });

  const defaultContentStyle = createLayout('flex', {
    direction: 'column',
    overrides: {
      padding: '16px',
      flex: 1,
      overflowY: 'auto'
    }
  });

  const mergedPanelStyle = { ...defaultPanelStyle, ...panelStyle };
  const mergedHeaderStyle = { ...defaultHeaderStyle, ...headerStyle };
  const mergedContentStyle = { ...defaultContentStyle, ...contentStyle };

  return (
    <div style={mergedPanelStyle}>
      <div
        style={mergedHeaderStyle}
        onClick={collapsible ? toggleExpanded : undefined}
      >
        {collapsible && <span style={{ marginRight: '8px' }}>
          {isExpanded ? '▼' : '▶'}
        </span>}
        {title}
      </div>
      {(!collapsible || isExpanded) && (
        <div style={mergedContentStyle}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Panel;
