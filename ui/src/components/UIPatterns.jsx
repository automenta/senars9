/**
 * Common UI patterns and components - consolidated and abstracted
 */

import React from 'react';
import { createStyle, createLayout, createAnimation } from '../utils/styling';

/**
 * Loading component with consistent styling
 */
export const LoadingSpinner = ({ message = 'Loading...', size = 'medium', className = '' }) => {
  const sizeMap = {
    small: { width: '20px', height: '20px', borderWidth: '2px' },
    medium: { width: '32px', height: '32px', borderWidth: '3px' },
    large: { width: '48px', height: '48px', borderWidth: '4px' }
  };

  const currentSize = sizeMap[size] || sizeMap.medium;
  const containerStyle = createLayout('flex', {
    direction: 'column',
    align: 'center',
    justify: 'center',
    overrides: {
      textAlign: 'center',
      padding: '20px',
      gap: '10px'
    }
  });

  const spinnerStyle = {
    ...currentSize,
    border: `${currentSize.borderWidth} solid #f3f3f3`,
    borderTop: `${currentSize.borderWidth} solid #007bff`,
    borderRadius: '50%',
    ...createAnimation('spin', '1s', 'linear')
  };

  return (
    <div className={`loading-container ${className}`} style={containerStyle}>
      <div style={spinnerStyle} />
      {message && <div style={{ fontSize: '14px', color: '#666' }}>{message}</div>}
    </div>
  );
};

/**
 * Error display component with consistent styling
 */
export const ErrorDisplay = ({ error, onRetry = null, retryMessage = 'Retry' }) => {
  const containerStyle = createLayout('flex', {
    direction: 'column',
    align: 'center',
    overrides: {
      padding: '20px',
      backgroundColor: '#f8d7da',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      color: '#721c24',
      textAlign: 'center',
      gap: '8px'
    }
  });

  const buttonStyle = createStyle('button', 'danger', null, {
    padding: '6px 12px',
    fontSize: '14px'
  });

  return (
    <div style={containerStyle}>
      <div style={{ fontWeight: 'bold' }}>Error occurred</div>
      <div style={{ fontSize: '14px' }}>
        {error?.message || error || 'An unknown error occurred'}
      </div>
      {onRetry && (
        <button onClick={onRetry} style={buttonStyle}>
          {retryMessage}
        </button>
      )}
    </div>
  );
};

/**
 * Empty state component for consistent UX
 */
export const EmptyState = ({ icon = '📋', title = 'No items', message, action = null }) => {
  const containerStyle = createLayout('flex', {
    direction: 'column',
    align: 'center',
    justify: 'center',
    overrides: {
      height: '100%',
      padding: '20px',
      textAlign: 'center',
      color: '#666',
      gap: '10px'
    }
  });

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: '32px' }}>{icon}</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{title}</div>
      {message && <div style={{ fontSize: '14px' }}>{message}</div>}
      {action && <div>{action}</div>}
    </div>
  );
};