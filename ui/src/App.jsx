import React from 'react';
import DockingLayout from './components/DockingLayout';
import ReasonerControlPanel from './components/ReasonerControlPanel';
import useCrdtWebSocket from './core/crdtWebSocket';
import CommandService from './services/CommandService';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';
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
    sendRawMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  } = useCrdtWebSocket(wsUrl);

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
              onAddTask={handleAddTask}
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
