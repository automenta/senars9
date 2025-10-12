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

  const handleAddTask = useCallback((task) => {
    const yTasks = ydoc.getArray('tasks');
    const taskMap = new Y.Map();
    Object.entries(task).forEach(([key, value]) => {
      taskMap.set(key, value);
    });
    yTasks.push([taskMap]);
  }, [ydoc]);

  const handleUpdateTask = useCallback((updatedTask) => {
    const yTasks = ydoc.getArray('tasks');
    const taskIndex = yTasks.toArray().findIndex(task => task.get('id') === updatedTask.id);
    if (taskIndex !== -1) {
      const taskMap = yTasks.get(taskIndex);
      for (const key in updatedTask) {
        if (key !== 'id') {
          taskMap.set(key, updatedTask[key]);
        }
      }
    }
  }, [ydoc]);

  const handleDeleteTask = useCallback((taskToDelete) => {
    const yTasks = ydoc.getArray('tasks');
    const taskIndex = yTasks.toArray().findIndex(task => task.get('id') === taskToDelete.id);
    if (taskIndex !== -1) {
      yTasks.delete(taskIndex, 1);
    }
  }, [ydoc]);

  const sortedTasks = useMemo(() => tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0)), [tasks]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: null,
    tasks: sortedTasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage: (message) => {
      if (provider && provider.ws) {
        // Properly encode and send message to WebSocket
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
