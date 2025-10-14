import { createPanelStyle, createHeaderStyle, createContentStyle } from '../utils/uiHelpers';

const Panel = ({ title, children, style = {}, headerStyle = {}, contentStyle = {} }) => (
  <div style={createPanelStyle(style)}>
    {title && (
      <div style={createHeaderStyle(headerStyle)}>
        {title}
      </div>
    )}
    <div style={createContentStyle(contentStyle)}>
      {children}
    </div>
  </div>
);

export default Panel;
