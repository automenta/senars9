// Consolidated configuration object for better organization
export const CONFIG = {
  theme: {
    colors: {
      primary: '#007bff',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      light: '#f8f9fa',
      dark: '#2c3e50',
      white: '#ffffff',
      gray: {
        100: '#f8f9fa',
        200: '#e9ecef',
        300: '#dee2e6',
        400: '#ced4da',
        500: '#adb5bd',
        600: '#6c757d',
        700: '#495057',
        800: '#343a40',
        900: '#212529'
      }
    },
    spacing: { xs: '5px', sm: '8px', md: '10px', lg: '15px', xl: '20px' },
    borderRadius: '4px',
    fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '24px' },
    fontWeight: { normal: 'normal', bold: 'bold' }
  },

  layout: {
    headerHeight: '30px',
    panelMinHeight: '200px',
    panelMaxHeight: '300px',
    borderWidth: '1px',
    scrollbarWidth: '8px'
  },

  connection: {
    status: {
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      CONNECTED: 'connected',
      RECONNECTING: 'reconnecting',
      ERROR: 'error'
    }
  },

  websocket: {
    defaultPort: 8080,
    fallbackPort: 8081,
    maxHistorySize: 50,
    maxReconnectAttempts: 10,
    reconnectInterval: 3000,
    messageRetention: 500,
    maxMessages: 1000,
    autoRequestState: true,
    enableMessageHistory: true
  },

  panels: {
    topPanel: { id: 'topPanel', name: 'Control & Input' },
    conceptMapPanel: { id: 'conceptMapPanel', name: 'Concept Map' },
    bottomPanel: { id: 'bottomPanel', name: 'Log & Tasks' }
  },

  messages: {
    types: {
      CONTROL: 'control',
      REQUEST_STATE: 'request_state',
      STATE_UPDATE: 'state_update',
      CONCEPTS_UPDATE: 'concepts_update',
      TOP_TASKS_UPDATE: 'top_tasks_update',
      LOG: 'log',
      TASK: 'task',
      CONCEPT: 'concept',
      REASONER_STATS: 'reasoner_stats'
    }
  }
};

// Backward compatibility exports
export const THEME = CONFIG.theme;
export const LAYOUT = CONFIG.layout;
export const CONNECTION_STATUS = CONFIG.connection.status;
export const WS_CONFIG = CONFIG.websocket;
export const PANEL_CONFIG = CONFIG.panels;
export const MESSAGE_TYPES = CONFIG.messages.types;