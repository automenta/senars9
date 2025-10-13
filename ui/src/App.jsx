import React from 'react';
import DockingLayout from './components/DockingLayout';
import ReasonerControlPanel from './components/ReasonerControlPanel';
import useWebSocket from './core/useWebSocket';
import CommandService from './services/CommandService';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';
import { CONNECTION_DEFAULTS } from './constants';
import './App.css';
import './Layout.css';

const App = () => {
  // Create WebSocket URL using the same host as the page (for same-origin)
  const urlParams = new URLSearchParams(window.location.search);
  const serverPort = urlParams.get('serverPort') || CONNECTION_DEFAULTS.defaultPort;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host.split(':')[0] || 'localhost'; // Get just the hostname part
  
  // Use simple protocol by adding query parameter since browser WebSockets can't send custom headers
  const wsUrl = `${wsProtocol}//${wsHost}:${serverPort}?protocol=simple`;

  const {
    tasks,
    logs,
    concepts,
    reasonerStats,
    connectionStatus,
    sendRawMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  } = useWebSocket(wsUrl);

  // Create command service instance
  const commandService = new CommandService(sendRawMessage);

  const handleCommand = (command, payload = {}) => {
    commandService.execute(command, payload);
  };

  return (
    <UIProvider>
      <NotificationProvider>
        <div className="main-container" data-testid="app-container">
          <div className="docking-layout-container">
            <DockingLayout
              logs={logs}
              tasks={tasks}
              concepts={concepts}
              reasonerStats={reasonerStats}
              connectionStatus={connectionStatus}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
          <ReasonerControlPanel
            stats={reasonerStats}
            onCommand={handleCommand}
            onAddTask={handleAddTask}
          />
        </div>
      </NotificationProvider>
    </UIProvider>
  );
};

export default App;
