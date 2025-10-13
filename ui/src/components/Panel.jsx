import { createStyle, createLayout } from '../utils/styling';

const Panel = ({ title, children }) => {
  const panelStyle = createStyle('panel');
  const headerStyle = createLayout('flex', {
    align: 'center',
    overrides: {
      padding: '8px 16px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      fontWeight: 'bold',
      fontSize: '16px',
      color: '#2c3e50'
    }
  });

  const contentStyle = createLayout('flex', {
    direction: 'column',
    overrides: {
      padding: '16px',
      flex: 1,
      overflowY: 'auto'
    }
  });

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        {title}
      </div>
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
};

export default Panel;
