// Custom hook for command handling logic
import { useCallback } from 'react';

export const useCommandHandler = (commandService, requestState, requestConcepts, requestTopTasks) => {
  const handleCommand = useCallback((command, payload = {}) => {
    console.log(`Executing command: ${command}`, payload);
    commandService.execute(command, payload);

    // Request updated state after commands that might change system state
    const stateCommands = ['start', 'step', 'stop', 'reset'];
    if (stateCommands.includes(command)) {
      setTimeout(requestState, 300);
    }

    // Request updated concepts after certain commands that might generate them
    const conceptCommands = ['start', 'step', 'add_task'];
    if (conceptCommands.includes(command)) {
      setTimeout(() => {
        requestConcepts();
        requestTopTasks();
      }, 500);
    }
  }, [commandService, requestState, requestConcepts, requestTopTasks]);

  const handleAddTaskWithConcepts = useCallback((task) => {
    handleCommand('add_task', task);
    setTimeout(requestConcepts, 300);
  }, [handleCommand, requestConcepts]);

  const handleUpdateTaskWithConcepts = useCallback((task) => {
    handleCommand('update_task', task);
    setTimeout(requestConcepts, 300);
  }, [handleCommand, requestConcepts]);

  return {
    handleCommand,
    handleAddTaskWithConcepts,
    handleUpdateTaskWithConcepts
  };
};