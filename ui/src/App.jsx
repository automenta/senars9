import React from 'react';
import DockingLayout from './components/DockingLayout';
import StatusBar from './components/StatusBar';
import useWebSocket from './core/WebSocketManager';
import { MESSAGE_TYPES, CONNECTION_DEFAULTS } from './constants';
import './App.css';
import './Layout.css';

const App = () => {
  // Create WebSocket URL dynamically based on the page's protocol and host
  // Extract server port from URL parameters if specified, otherwise use default
  const urlParams = new URLSearchParams(window.location.search);
  const serverPort = urlParams.get('serverPort') || CONNECTION_DEFAULTS.defaultPort;
  
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname; // Use hostname without port
  const wsUrl = `${wsProtocol}//${wsHost}:${serverPort}`;
  
  const { messages, sendMessage } = useWebSocket(wsUrl);

  const filteredLogMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.log);
  const filteredTaskMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.task);
  const filteredConceptMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.concept);
  const reasonerStats = messages.find(msg => msg.type === MESSAGE_TYPES.reasonerStats)?.data || null;

  const handleSendMessage = (command) => {
    sendMessage({ type: 'command', data: command });
  };

  return (
    <div className="main-container" data-testid="app-container">
      <div className="docking-layout-container">
        <DockingLayout
          logs={filteredLogMessages}
          tasks={filteredTaskMessages}
          concepts={filteredConceptMessages}
        />
      </div>
      <StatusBar onSend={handleSendMessage} stats={reasonerStats} />
    </div>
  );
};

export default App;
