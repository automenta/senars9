import React from 'react';
import DockingLayout from './components/DockingLayout';
import StatusBar from './components/StatusBar';
import useCrdtWebSocket from './core/crdtWebSocket';
import { MESSAGE_TYPES, CONNECTION_DEFAULTS } from './constants';
import './App.css';
import './Layout.css';

const App = () => {
  // Create WebSocket URL dynamically
  const urlParams = new URLSearchParams(window.location.search);
  const serverPort = urlParams.get('serverPort') || CONNECTION_DEFAULTS.defaultPort;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname;
  const wsUrl = `${wsProtocol}//${wsHost}:${serverPort}`;

  const { messages, tasks, sendCrdtMessage, sendRawMessage } = useCrdtWebSocket(wsUrl);

  // Filter messages for different panels (logs, concepts, etc.)
  const filteredLogMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.log);
  const filteredConceptMessages = messages.filter(msg => msg.type === MESSAGE_TYPES.concept);
  const reasonerStats = messages.find(msg => msg.type === MESSAGE_TYPES.reasonerStats)?.data || null;

  // Handlers for Task CRUD operations
  const handleAddTask = (task) => {
    sendCrdtMessage('task-create', task);
  };

  const handleUpdateTask = (task) => {
    sendCrdtMessage('task-update-priority', task);
  };

  const handleDeleteTask = (task) => {
    sendCrdtMessage('task-delete', task);
  };

  const handleSendRawMessage = (command) => {
    sendRawMessage({ type: 'command', data: command });
  };

  return (
    <div className="main-container" data-testid="app-container">
      <div className="docking-layout-container">
        <DockingLayout
          logs={filteredLogMessages}
          tasks={tasks} // Pass the CRDT tasks to the layout
          concepts={filteredConceptMessages}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>
      <StatusBar onSend={handleSendRawMessage} stats={reasonerStats} />
    </div>
  );
};

export default App;
