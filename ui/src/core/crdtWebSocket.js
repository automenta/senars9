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

    wsProvider.on('status', event => setConnectionStatus(event.status));

    const yTasks = ydoc.getArray('tasks');
    const yLogs = ydoc.getArray('logs');
    const yConcepts = ydoc.getArray('concepts');

    const observers = {
      tasks: () => setTasks(yTasks.toArray().map(task => task instanceof Y.Map ? task.toJSON() : task)),
      logs: () => setLogs(yLogs.toArray()),
      concepts: () => setConcepts(yConcepts.toArray())
    };

    Object.entries(observers).forEach(([key, observer]) => ydoc.getArray(key).observe(observer));

    wsProvider.awareness.on('change', () => {
      setReasonerStats(Array.from(wsProvider.awareness.getStates().values())
        .find(state => state.reasonerStats)?.reasonerStats || null);
    });

    return () => wsProvider.disconnect();
  }, [url, ydoc]);

  useEffect(() => {
    if (connectionStatus === 'connected' && provider?.ws?.readyState === WebSocket.OPEN) {
      [{ content: '(a-->b).', priority: 0.9 }, { content: '(b-->c).', priority: 0.8 }]
        .forEach(task => sendMessage('add_task', task));
    }
  }, [connectionStatus, provider, sendMessage]);

  const sendMessage = useCallback((command, payload = {}) => {
    provider?.ws?.readyState === WebSocket.OPEN && provider.ws.send(JSON.stringify({
      type: 'control',
      command,
      payload
    }));
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
    sendRawMessage: message => provider?.ws?.readyState === WebSocket.OPEN && provider.ws.send(JSON.stringify(message)),
    sendMessage,
    handleAddTask: task => sendMessage('add_task', task),
    handleUpdateTask: task => sendMessage('update_task', task),
    handleDeleteTask: task => sendMessage('delete_task', { id: task.id }),
  };
};

export default useCrdtWebSocket;
