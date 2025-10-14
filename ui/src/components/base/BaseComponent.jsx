import React from 'react';
import { createPanelStyle, createHeaderStyle, createContentStyle } from '../../utils/uiHelpers';

/**
 * Base component abstraction for consistent UI patterns
 * Provides common functionality that can be extended by specific components
 */

const BaseComponent = ({
  title,
  children,
  className = '',
  style = {},
  headerStyle = {},
  contentStyle = {},
  loading = false,
  error = null,
  showHeader = true,
  expandable = false,
  defaultExpanded = false,
  onToggle = null,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const renderContent = () => {
    if (error) {
      return (
        <div style={{ color: 'red', padding: '10px' }}>
          Error: {error}
        </div>
      );
    }

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      );
    }

    return children;
  };

  const toggleExpanded = () => {
    if (expandable) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onToggle?.(newExpanded);
    }
  };

  const header = showHeader && title && (
    <div
      style={createHeaderStyle({
        ...headerStyle,
        ...(expandable && {
          cursor: 'pointer',
          backgroundColor: isExpanded ? '#e7f1ff' : '#f8f9fa',
          border: `1px solid ${isExpanded ? '#0d6efd' : '#ced4da'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        })
      })}
      onClick={expandable ? toggleExpanded : undefined}
    >
      <span>{title}</span>
      {expandable && <span>{isExpanded ? '▼' : '▶'}</span>}
    </div>
  );

  const content = (
    <div style={createContentStyle({
      ...contentStyle,
      ...(expandable && !isExpanded && { display: 'none' })
    })}>
      {renderContent()}
    </div>
  );

  return (
    <div
      className={`base-component ${className}`}
      style={createPanelStyle(style)}
      {...props}
    >
      {header}
      {content}
    </div>
  );
};

export default BaseComponent;