import React from 'react';
import PropTypes from 'prop-types';
import { THEME } from '../constants';

const panelStyles = {
  border: `1px solid ${THEME.colors.gray[300]}`,
  borderRadius: THEME.borderRadius,
  backgroundColor: THEME.colors.white,
  marginBottom: THEME.spacing.md,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const headerStyles = {
  padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
  backgroundColor: THEME.colors.gray[100],
  borderBottom: `1px solid ${THEME.colors.gray[300]}`,
  fontWeight: THEME.fontWeight.bold,
  fontSize: THEME.fontSize.md,
  color: THEME.colors.dark
};

const contentStyles = {
  padding: THEME.spacing.md,
  flex: 1,
  overflowY: 'auto'
};

const Panel = ({ title, children }) => (
  <div style={panelStyles}>
    <div style={headerStyles}>{title}</div>
    <div style={contentStyles}>
      {children}
    </div>
  </div>
);

Panel.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

export default Panel;
