import { useMemo, useCallback, useRef } from 'react';
import CommandService from '../services/CommandService';

/**
 * Optimized command handler hook with better performance and less duplication
 * Uses refs for stable function references and memoization for expensive operations
 */

const COMMANDS_REQUIRING_STATE_UPDATE = new Set(['start', 'step', 'stop', 'reset']);
const COMMANDS_REQUIRING_CONCEPT_UPDATE = new Set(['start', 'step', 'add_task']);

const useOptimizedCommandHandler = (
  sendRawMessage,
  requestState,
  requestConcepts,
  requestTopTasks,
  on,
  off
) => {
  // Use refs for functions that don't need to trigger re-renders
  const requestStateRef = useRef(requestState);
  const requestConceptsRef = useRef(requestConcepts);
  const requestTopTasksRef = useRef(requestTopTasks);
  const onRef = useRef(on);
  const offRef = useRef(off);

  // Keep refs updated
  requestStateRef.current = requestState;
  requestConceptsRef.current = requestConcepts;
  requestTopTasksRef.current = requestTopTasks;
  onRef.current = on;
  offRef.current = off;

  // Memoize command service - only recreate when sendRawMessage changes
  const commandService = useMemo(() => {
    if (!sendRawMessage) return null;
    return new CommandService(sendRawMessage);
  }, [sendRawMessage]);

  // Memoize the command execution logic
  const executeCommandWithUpdates = useCallback((command, payload = {}) => {
    if (!commandService) {
      console.warn('CommandService not available');
      return;
    }

    console.log(`Executing command: ${command}`, payload);
    commandService.execute(command, payload);

    // Determine what updates are needed using Sets for O(1) lookup
    const needsStateUpdate = COMMANDS_REQUIRING_STATE_UPDATE.has(command);
    const needsConceptUpdate = COMMANDS_REQUIRING_CONCEPT_UPDATE.has(command);

    if (needsStateUpdate || needsConceptUpdate) {
      setupPostCommandListener(needsStateUpdate, needsConceptUpdate);
    }
  }, [commandService]);

  // Memoize the post-command listener setup
  const setupPostCommandListener = useCallback((needsStateUpdate, needsConceptUpdate) => {
    if (!onRef.current || !offRef.current) return;

    const onceListener = () => {
      if (needsStateUpdate && requestStateRef.current) {
        requestStateRef.current();
      }
      if (needsConceptUpdate && requestConceptsRef.current) {
        requestConceptsRef.current();
        requestTopTasksRef.current?.();
      }
    };

    const wrapper = () => {
      onRef.current?.('message', wrapper);
      clearTimeout(timeoutId);
      onceListener();
    };

    onRef.current('message', wrapper);

    // Cleanup timeout
    const timeoutId = setTimeout(() => {
      offRef.current?.('message', wrapper);
    }, 3000);

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      offRef.current?.('message', wrapper);
    };
  }, []);

  // Main command handler - stable reference
  const handleCommand = useCallback((command, payload = {}) => {
    executeCommandWithUpdates(command, payload);
  }, [executeCommandWithUpdates]);

  return {
    handleCommand,
    commandService,
    isReady: !!commandService
  };
};

export default useOptimizedCommandHandler;