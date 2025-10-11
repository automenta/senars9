import React from 'react';
import DockingLayout from './components/DockingLayout';
import UnifiedMenuBar from './components/UnifiedMenuBar';
import useCrdtWebSocket from './core/crdtWebSocket';
import { CONNECTION_DEFAULTS } from './constants';
import './App.css';
import './Layout.css';

const App = () => {
  // Create WebSocket URL dynamically
  const urlParams = new URLSearchParams(window.location.search);
  const serverPort = urlParams.get('serverPort') || CONNECTION_DEFAULTS.defaultPort;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.hostname;
  const wsUrl = `${wsProtocol}//${wsHost}:${serverPort}`;

  const {
    tasks,
    logs,
    concepts,
    reasonerStats,
    sendCrdtMessage,
    sendRawMessage,
  } = useCrdtWebSocket(wsUrl);

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
    sendRawMessage({ type: 'command', payload: { data: command } });
  };

  return (
    <div className="main-container" data-testid="app-container">
      <div className="docking-layout-container">
        <DockingLayout
          logs={logs}
          tasks={tasks}
          concepts={concepts}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>
      <UnifiedMenuBar
        stats={reasonerStats}
        onCommand={handleSendRawMessage}
        onAddTask={handleAddTask}
      />
    </div>
  );
};

export default App;
