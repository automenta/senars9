import React, { useEffect } from 'react';
import DockingLayout from './components/DockingLayout';
import ReasonerControlPanel from './components/ReasonerControlPanel';
import useWebSocket from './core/useWebSocket';
import CommandService from './services/CommandService';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';
import { CONNECTION_DEFAULTS } from '../core/shared/ClientConstants.js';
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
    memoryTasks,
    reasonerStats,
    connectionStatus,
    sendRawMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
  } = useWebSocket(wsUrl);

  // Create command service instance
  const commandService = new CommandService(sendRawMessage);

  const handleCommand = (command, payload = {}) => {
    console.log(`Executing command: ${command}`, payload);
    commandService.execute(command, payload);

    // Request updated state after commands that might change system state
    if (['start', 'step', 'stop', 'reset'].includes(command)) {
      setTimeout(() => {
        requestState();
      }, 300); // Small delay to allow server processing
    }

    // Request updated concepts after certain commands that might generate them
    if (['start', 'step', 'add_task'].includes(command)) {
      setTimeout(() => {
        requestConcepts();
        requestTopTasks(); // Also request top tasks from Memory
      }, 500); // Small delay to allow server processing
    }
  };

  const handleAddTaskWithConcepts = (task) => {
    if (handleAddTask) {
      handleAddTask(task);

      // Request concepts after adding a task that might generate new concepts
      setTimeout(() => {
        requestConcepts();
      }, 300);
    } else {
      console.error('Cannot add task: WebSocket connection not ready');
    }
  };

  const handleUpdateTaskWithConcepts = (task) => {
    if (handleUpdateTask) {
      handleUpdateTask(task);

      // Request concepts after updating a task that might generate new concepts
      setTimeout(() => {
        requestConcepts();
      }, 300);
    } else {
      console.error('Cannot update task: WebSocket connection not ready');
    }
  };

  // Request initial concepts and top tasks when component mounts
  useEffect(() => {
    if (connectionStatus === 'connected') {
      setTimeout(() => {
        requestConcepts();
        requestTopTasks();
      }, 200);
    }
  }, [connectionStatus, requestConcepts, requestTopTasks]);

  return (
    <UIProvider>
      <NotificationProvider>
        <div className="main-container" data-testid="app-container">
          <div className="docking-layout-container">
            <DockingLayout
              logs={logs}
              tasks={tasks}
              concepts={concepts}
              memoryTasks={memoryTasks}
              reasonerStats={reasonerStats}
              connectionStatus={connectionStatus}
              onUpdateTask={handleUpdateTaskWithConcepts}
              onDeleteTask={handleDeleteTask}
            />
          </div>
          <ReasonerControlPanel
            stats={reasonerStats}
            onCommand={handleCommand}
            onAddTask={handleAddTaskWithConcepts}
          />
        </div>
      </NotificationProvider>
    </UIProvider>
  );
};

export default App;
