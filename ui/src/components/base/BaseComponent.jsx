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
  ...props
}) => {
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

  return (
    <div
      className={`base-component ${className}`}
      style={createPanelStyle(style)}
      {...props}
    >
      {showHeader && title && (
        <div style={createHeaderStyle(headerStyle)}>
          {title}
        </div>
      )}
      <div style={createContentStyle(contentStyle)}>
        {renderContent()}
      </div>
    </div>
  );
};

export default BaseComponent;