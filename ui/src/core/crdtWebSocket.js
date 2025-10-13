import { useEffect, useState, useMemo, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const useCrdtWebSocket = (url) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [reasonerStats, setReasonerStats] = useState(null);

  useEffect(() => {
    if (!url) return;

    const wsProvider = new WebsocketProvider(url, 'senars', ydoc);
    setProvider(wsProvider);

    wsProvider.on('status', (event) => {
      setConnectionStatus(event.status);
    });

    const yTasks = ydoc.getArray('tasks');
    const yLogs = ydoc.getArray('logs');
    const yConcepts = ydoc.getArray('concepts');

    const observeTasks = () => setTasks(yTasks.toArray().map(task => task instanceof Y.Map ? task.toJSON() : task));
    const observeLogs = () => setLogs(yLogs.toArray());
    const observeConcepts = () => setConcepts(yConcepts.toArray());

    yTasks.observe(observeTasks);
    yLogs.observe(observeLogs);
    yConcepts.observe(observeConcepts);

    wsProvider.awareness.on('change', () => {
      const stats = Array.from(wsProvider.awareness.getStates().values()).find(state => state.reasonerStats)?.reasonerStats;
      if (stats) {
        setReasonerStats(stats);
      }
    });

    return () => {
      wsProvider.disconnect();
    };
  }, [url, ydoc]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      const initialTasks = [
        { content: '(a-->b).', priority: 0.9 },
        { content: '(b-->c).', priority: 0.8 },
      ];
      initialTasks.forEach(task => {
        if (provider && provider.ws && provider.ws.readyState === WebSocket.OPEN) {
          const message = {
            type: 'control',
            command: 'add_task',
            payload: task
          };
          provider.ws.send(JSON.stringify(message));
        }
      });
    }
  }, [connectionStatus, provider]);

  const handleAddTask = useCallback((task) => {
    // Send the add_task command to server instead of directly modifying Yjs document
    if (provider && provider.ws && provider.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'control',
        command: 'add_task',
        payload: task
      };
      const encodedMessage = JSON.stringify(message);
      provider.ws.send(encodedMessage);
    }
  }, [provider]);

  const handleUpdateTask = useCallback((updatedTask) => {
    // Send the update_task command to server instead of directly modifying Yjs document
    if (provider && provider.ws && provider.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'control',
        command: 'update_task',
        payload: updatedTask
      };
      const encodedMessage = JSON.stringify(message);
      provider.ws.send(encodedMessage);
    }
  }, [provider]);

  const handleDeleteTask = useCallback((taskToDelete) => {
    // Send the delete_task command to server instead of directly modifying Yjs document
    if (provider && provider.ws && provider.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'control',
        command: 'delete_task',
        payload: { id: taskToDelete.id }
      };
      const encodedMessage = JSON.stringify(message);
      provider.ws.send(encodedMessage);
    }
  }, [provider]);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0)), [tasks]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: null,
    tasks: sortedTasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage: (message) => {
      if (provider && provider.ws && provider.ws.readyState === WebSocket.OPEN) {
        // Properly encode and send message to WebSocket
        const encodedMessage = JSON.stringify(message);
        provider.ws.send(encodedMessage);
      }
    },
    sendMessage: (command, payload = {}) => {
      // Standardized method to send control commands
      if (provider && provider.ws && provider.ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'control',
          command,
          payload
        };
        const encodedMessage = JSON.stringify(message);
        provider.ws.send(encodedMessage);
      }
    },
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  };
};

export default useCrdtWebSocket;
