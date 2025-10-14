import { useMemo, useCallback } from 'react';
import CommandService from '../services/CommandService';

const useCommandHandler = (
  sendRawMessage,
  requestState,
  requestConcepts,
  requestTopTasks,
  on,
  off
) => {
  const commandService = useMemo(() => new CommandService(sendRawMessage), [sendRawMessage]);

  const handleCommand = useCallback((command, payload = {}) => {
    console.log(`Executing command: ${command}`, payload);
    commandService.execute(command, payload);

    const needsStateUpdate = ['start', 'step', 'stop', 'reset'].includes(command);
    const needsConceptUpdate = ['start', 'step', 'add_task'].includes(command);

    if (on && off && (needsStateUpdate || needsConceptUpdate)) {
      const onceListener = () => {
        if (needsStateUpdate) {
          requestState();
        }
        if (needsConceptUpdate) {
          requestConcepts();
          requestTopTasks();
        }
      };

      const wrapper = () => {
        off('message', wrapper);
        clearTimeout(timeoutId);
        onceListener();
      };

      on('message', wrapper);

      // Add a timeout to unregister the listener if no message is received
      const timeoutId = setTimeout(() => {
        off('message', wrapper);
      }, 3000); // 3 seconds timeout
    }
  }, [sendRawMessage, requestState, requestConcepts, requestTopTasks, on, off, commandService]);


  return { handleCommand };
};

export default useCommandHandler;
