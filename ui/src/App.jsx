import React, { useEffect } from 'react';
import DockingLayout from './components/DockingLayout';
import ReasonerControlPanel from './components/ReasonerControlPanel';
import useWebSocket from './core/useWebSocket';
import { useCommandHandler } from './core/useCommandHandler';
import { useWebSocketUrl } from './core/useWebSocketUrl';
import CommandService from './services/CommandService';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';
import './App.css';

const AppContent = () => {
  const wsUrl = useWebSocketUrl();

  const {
    tasks,
    logs,
    concepts,
    memoryTasks,
    reasonerStats,
    connectionStatus,
    sendRawMessage,
    handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
  } = useWebSocket(wsUrl, { mode: 'standard' });

  // Create command service instance
  const commandService = new CommandService(sendRawMessage);

  // Use extracted command handler hook
  const { handleCommand, handleAddTaskWithConcepts, handleUpdateTaskWithConcepts } = useCommandHandler(
    commandService,
    requestState,
    requestConcepts,
    requestTopTasks
  );

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
  );
};

const App = () => {
  return (
    <UIProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </UIProvider>
  );
};

export default App;
