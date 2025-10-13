import { useEffect, useState, useCallback } from 'react';

const useSimpleWebSocket = (url) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [reasonerStats, setReasonerStats] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!url) return;

    // For the simple protocol, we need to ensure we're connecting properly
    // Note: Browser WebSocket API doesn't allow custom headers, so we rely on the server
    // to default to simple protocol for browser clients or use URL parameters if needed
    const websocket = new WebSocket(url);
    setWs(websocket);

    websocket.onopen = () => {
      console.log('WebSocket connected, sending initial state request');
      setConnectionStatus('connected');
    };

    websocket.onclose = () => {
      setConnectionStatus('disconnected');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    websocket.onmessage = (event) => {
      try {
        // Convert the message data to string if it isn't already
        let data;
        if (typeof event.data === 'string') {
          data = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          // Convert ArrayBuffer to string
          const textDecoder = new TextDecoder();
          data = textDecoder.decode(event.data);
        } else {
          // Handle as Blob
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result;
              const message = JSON.parse(text);
              
              if (message.type === 'state_update' && message.payload) {
                const { tasks, concepts, logs, stats } = message.payload;
                setTasks(tasks || []);
                setConcepts(concepts || []);
                setLogs(logs || []);
                setReasonerStats(stats || null);
              }
            } catch (parseError) {
              console.error('Error parsing WebSocket message:', parseError);
            }
          };
          reader.readAsText(event.data);
          return; // Return early, parsing happens in the callback
        }

        // Parse the string data
        const message = JSON.parse(data);
        
        if (message.type === 'state_update' && message.payload) {
          const { tasks, concepts, logs, stats } = message.payload;
          setTasks(tasks || []);
          setConcepts(concepts || []);
          setLogs(logs || []);
          setReasonerStats(stats || null);
        } else {
          // Handle other message types if needed
          console.log('Received non-state-update message:', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      websocket.close();
    };
  }, [url]);

  const sendRawMessage = useCallback((message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, could not send message:', message);
    }
  }, [ws]);

  const sendMessage = useCallback((command, payload = {}) => {
    sendRawMessage({
      type: 'control',
      command,
      payload
    });
  }, [sendRawMessage]);

  const handleAddTask = useCallback((task) => {
    sendMessage('add_task', task);
  }, [sendMessage]);

  const handleUpdateTask = useCallback((updatedTask) => {
    sendMessage('update_task', updatedTask);
  }, [sendMessage]);

  const handleDeleteTask = useCallback((taskToDelete) => {
    sendMessage('delete_task', { id: taskToDelete.id });
  }, [sendMessage]);

  // Sort tasks by priority
  const sortedTasks = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error: connectionStatus === 'error' ? 'WebSocket connection error' : null,
    tasks: sortedTasks,
    logs,
    concepts,
    reasonerStats,
    sendRawMessage,
    sendMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
  };
};

export default useSimpleWebSocket;