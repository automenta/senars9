import React from 'react';
import DockingLayout from './components/DockingLayout';
import StatusBar from './components/StatusBar';
import useWebSocket from './core/WebSocketManager';
import { MESSAGE_TYPES, CONNECTION_DEFAULTS } from './constants';
import './App.css';
import './Layout.css';

const App = () => {
  const { messages, sendMessage } = useWebSocket(`ws://localhost:${CONNECTION_DEFAULTS.defaultPort}`);

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
