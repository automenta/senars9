import { THEME } from '../constants';

const Panel = ({ title, children }) => (
  <div style={{
    border: `1px solid ${THEME.colors.gray[300]}`,
    borderRadius: THEME.borderRadius,
    backgroundColor: THEME.colors.white,
    marginBottom: THEME.spacing.md,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }}>
    <div style={{
      padding: `${THEME.spacing.sm} ${THEME.spacing.md}`,
      backgroundColor: THEME.colors.gray[100],
      borderBottom: `1px solid ${THEME.colors.gray[300]}`,
      fontWeight: THEME.fontWeight.bold,
      fontSize: THEME.fontSize.md,
      color: THEME.colors.dark
    }}>
      {title}
    </div>
    <div style={{
      padding: THEME.spacing.md,
      flex: 1,
      overflowY: 'auto'
    }}>
      {children}
    </div>
  </div>
);

export default Panel;
