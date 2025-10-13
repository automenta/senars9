/**
 * @deprecated Use Panel component with collapsible=true instead
 * This component is maintained for backward compatibility
 */

import React from 'react';
import Panel from './Panel';

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
  return (
    <div style={panelWrapperStyle}>
      <Panel
        title={title}
        collapsible={true}
        defaultExpanded={defaultExpanded}
        onToggle={onToggle}
        headerStyle={{
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          border: '1px solid #ced4da',
          borderRadius: '4px',
          margin: '2px 0',
          ...headerWrapperStyle
        }}
        contentStyle={{
          marginTop: '5px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #ced4da',
          borderRadius: '4px',
          ...contentWrapperStyle
        }}
        panelStyle={{ margin: 0, border: 'none', backgroundColor: 'transparent', boxShadow: 'none' }}
      >
        {children}
      </Panel>
      {triggerComponent}
    </div>
  );
};

export default ExpandablePanel;