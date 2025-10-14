import React, { useEffect } from 'react';
import DockingLayout from '@/components/DockingLayout';
import ReasonerControlPanel from '@/components/ReasonerControlPanel';
import { UIProvider } from '@/core/UIContext';
import { NotificationProvider } from '@/core/NotificationSystem';
import { useAppWebSocket } from '@/hooks/useAppWebSocket';
import useCommandHandler from '@/hooks/useCommandHandler';
import './App.css';

const App = () => {
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
    on,
    off,
  } = useAppWebSocket();

  const { handleCommand } = useCommandHandler(
    sendRawMessage,
    requestState,
    requestConcepts,
    requestTopTasks,
    on,
    off
  );

  const requestAfterDelay = (fn, delay) => setTimeout(fn, delay);

  const handleTaskWithConcepts = (handler, task) => {
    handler?.(task) ? requestAfterDelay(requestConcepts, 300) : console.error(`Cannot ${handler.name}: WebSocket connection not ready`);
  };

  const handleAddTaskWithConcepts = (task) => handleTaskWithConcepts(handleAddTask, task);
  const handleUpdateTaskWithConcepts = (task) => handleTaskWithConcepts(handleUpdateTask, task);

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
