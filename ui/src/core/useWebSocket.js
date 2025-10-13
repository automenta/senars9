import { useEffect, useState, useCallback } from 'react';

const useWebSocket = (url) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [data, setData] = useState({});
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!url) return;

    const websocket = new WebSocket(url);
    setWs(websocket);

    websocket.onopen = () => {
      setConnectionStatus('connected');
      // Request initial state when connected
      setTimeout(() => {
        sendRawMessage({ type: 'request_state' });
      }, 100);
    };

    websocket.onclose = () => setConnectionStatus('disconnected');

    websocket.onerror = () => setConnectionStatus('error');

    websocket.onmessage = (event) => {
      try {
        const data = event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : event.data instanceof Blob
            ? (() => { const reader = new FileReader(); reader.onload = () => {
                try {
                  const message = JSON.parse(reader.result);
                  // Handle server responses for state synchronization
                  if (message.type === 'state_update' && message.payload) {
                    const { tasks, concepts, logs, stats } = message.payload;
                    setData(prev => ({
                      ...prev,
                      tasks: tasks || prev.tasks || [],
                      concepts: concepts || prev.concepts || [],
                      logs: logs || prev.logs || [],
                      reasonerStats: stats || prev.reasonerStats
                    }));
                  }
                } catch (parseError) {
                  console.error('Error parsing WebSocket message:', parseError);
                }
              }; reader.readAsText(event.data); return; })()
            : event.data;

        if (data) {
          try {
            const message = JSON.parse(data);
            if (message.type === 'state_update' && message.payload) {
              const { tasks, concepts, logs, stats } = message.payload;
              setData(prev => ({
                ...prev,
                tasks: tasks || prev.tasks || [],
                concepts: concepts || prev.concepts || [],
                logs: logs || prev.logs || [],
                reasonerStats: stats || prev.reasonerStats
              }));
            }
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError);
          }
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    return () => websocket.close();
  }, [url]);


  const sendRawMessage = useCallback((message) => {
    ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(message));
  }, [ws]);

  const sendMessage = useCallback((command, payload = {}) => {
    sendRawMessage({ type: 'control', command, payload });
  }, [sendRawMessage]);

  const handleAddTask = useCallback((task) => {
    // Optimistically add task to local state for immediate UI feedback
    const newTask = {
      ...task,
      id: task.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: task.createdAt || new Date().toISOString(),
      type: task.type || 'input',
      status: task.status || 'pending'
    };

    setData(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), newTask]
    }));

    // Send to server
    sendMessage('add_task', newTask);
  }, [sendMessage]);

  const handleUpdateTask = useCallback((task) => {
    setData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t)
    }));
    sendMessage('update_task', task);
  }, [sendMessage]);

  const handleDeleteTask = useCallback((task) => {
    setData(prev => ({
      ...prev,
      tasks: (prev.tasks || []).filter(t => t.id !== task.id)
    }));
    sendMessage('delete_task', { id: task.id });
  }, [sendMessage]);

  const requestConcepts = useCallback(() => {
    sendMessage('get_concepts');
  }, [sendMessage]);

  const requestState = useCallback(() => {
    sendRawMessage({ type: 'request_state' });
  }, [sendRawMessage]);

  const sortedTasks = [...(data.tasks || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: connectionStatus === 'error' ? 'WebSocket connection error' : null,
    tasks: sortedTasks,
    logs: data.logs || [],
    concepts: data.concepts || [],
    reasonerStats: data.reasonerStats || null,
    sendRawMessage,
    sendMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    requestConcepts,
    requestState,
  };
};

export default useWebSocket;