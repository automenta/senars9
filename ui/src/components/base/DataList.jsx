import React from 'react';
import BaseComponent from './BaseComponent';
import { createFlexLayout, getStatusColor } from '../../utils/uiHelpers';

/**
 * Reusable data list component
 * Provides consistent display for lists of items (tasks, concepts, etc.)
 */

const DataList = ({
  items = [],
  renderItem,
  keyExtractor,
  title,
  emptyMessage = 'No items to display',
  loading = false,
  error = null,
  style = {},
  itemStyle = {},
  ...props
}) => {
  const renderContent = () => {
    if (error) return null; // Error handled by BaseComponent

    if (items.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div style={{ ...createFlexLayout('column', 'stretch', 'stretch'), gap: '8px' }}>
        {items.map((item, index) => (
          <div
            key={keyExtractor ? keyExtractor(item, index) : index}
            style={{
              padding: '8px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
              ...itemStyle
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <BaseComponent
      title={title}
      loading={loading}
      error={error}
      style={style}
      {...props}
    >
      {renderContent()}
    </BaseComponent>
  );
};

export default DataList;