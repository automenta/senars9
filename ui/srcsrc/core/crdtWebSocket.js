import { useEffect, useState, useMemo } from 'react';
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

    const observeTasks = () => setTasks(yTasks.toArray());
    const observeLogs = () => setLogs(yLogs.toArray());
    const observeConcepts = () => setConcepts(yConcepts.toArray());

    yTasks.observe(observeTasks);
    yLogs.observe(observeLogs);
    yConcepts.observe(observeConcepts);

    wsProvider.awareness.on('change', () => {
      const stats = wsProvider.awareness.getStates().get(wsProvider.awareness.clientID)?.reasonerStats;
      if (stats) {
        setReasonerStats(stats);
      }
    });


    return () => {
      wsProvider.disconnect();
    };
  }, [url, ydoc]);

  const handleAddTask = (task) => {
    const yTasks = ydoc.getArray('tasks');
    yTasks.push([new Y.Map(Object.entries(task))]);
  };

  const handleUpdateTask = (updatedTask) => {
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
  };

  const handleDeleteTask = (taskToDelete) => {
    const yTasks = ydoc.getArray('tasks');
    const taskIndex = yTasks.toArray().findIndex(task => task.get('id') === taskToDelete.id);
    if (taskIndex !== -1) {
      yTasks.delete(taskIndex, 1);
    }
  };

  const sortedTasks = useMemo(() => tasks.sort((a, b) => b.get('priority') - a.get('priority')), [tasks]);

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: null, // y-websocket does not expose the error directly
    tasks: sortedTasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage: (message) => {
      // Not directly supported by y-websocket, but can be implemented with custom messages
    },
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  };
};

export default useCrdtWebSocket;
