import { useEffect, useState, useMemo, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { sortTasksByPriority, WebSocketTaskManager } from '../utils/webSocketUtils';

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

    wsProvider.on('status', event => setConnectionStatus(event.status));

    const yTasks = ydoc.getArray('tasks');
    const yLogs = ydoc.getArray('logs');
    const yConcepts = ydoc.getArray('concepts');

    // Set up Yjs observers
    yTasks.observe(() => setTasks(yTasks.toArray().map(task =>
      task instanceof Y.Map ? task.toJSON() : task
    )));
    yLogs.observe(() => setLogs(yLogs.toArray()));
    yConcepts.observe(() => setConcepts(yConcepts.toArray()));

    wsProvider.awareness.on('change', () => {
      setReasonerStats(Array.from(wsProvider.awareness.getStates().values())
        .find(state => state.reasonerStats)?.reasonerStats || null);
    });

    return () => wsProvider.disconnect();
  }, [url, ydoc]);

  const sendMessage = useCallback((command, payload = {}) => {
    if (provider?.ws?.readyState === WebSocket.OPEN) {
      provider.ws.send(JSON.stringify({ type: 'control', command, payload }));
    }
  }, [provider]);

  const taskManager = useMemo(() =>
    new WebSocketTaskManager({ sendMessage, sortTasksByPriority }),
    [sendMessage]
  );

  const sortedTasks = useMemo(() =>
    taskManager.getSortedTasks(tasks),
    [tasks, taskManager]
  );

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: null,
    tasks: sortedTasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage: message => provider?.ws?.readyState === WebSocket.OPEN &&
      provider.ws.send(JSON.stringify(message)),
    sendMessage,
    handleAddTask: task => taskManager.handleAddTask(task),
    handleUpdateTask: task => taskManager.handleUpdateTask(task),
    handleDeleteTask: task => taskManager.handleDeleteTask(task),
  };
};

export default useCrdtWebSocket;
