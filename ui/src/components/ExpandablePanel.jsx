/**
 * Expandable Panel component for collapsible content sections
 */

import React, { useState } from 'react';

const ExpandablePanel = ({ 
  title, 
  children, 
  defaultExpanded = false,
  onToggle = null,
  triggerComponent = null,
  contentWrapperStyle = {},
  headerWrapperStyle = {},
  panelWrapperStyle = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onToggle) {
      onToggle(newExpanded);
    }
  };
  
  const defaultHeaderWrapperStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '8px 12px',
    backgroundColor: isExpanded ? '#e7f1ff' : '#f8f9fa',
    border: `1px solid ${isExpanded ? '#0d6efd' : '#ced4da'}`,
    borderRadius: '4px',
    margin: '2px 0'
  };
  
  const defaultContentWrapperStyle = {
    marginTop: '5px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #ced4da',
    borderRadius: '4px'
  };
  
  const defaultPanelWrapperStyle = {
    margin: '5px 0'
  };

  return (
    <div style={{...defaultPanelWrapperStyle, ...panelWrapperStyle}}>
      <div 
        style={{...defaultHeaderWrapperStyle, ...headerWrapperStyle}} 
        onClick={toggleExpanded}
      >
        <span>{title}</span>
        <span>{isExpanded ? '▼' : '▶'}</span>
        {triggerComponent}
      </div>
      {isExpanded && (
        <div style={{...defaultContentWrapperStyle, ...contentWrapperStyle}}>
          {children}
        </div>
      )}
    </div>
  );
};

export default ExpandablePanel;