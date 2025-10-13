import { useEffect, useState, useCallback, useRef } from 'react';

const useWebSocket = (url, config = {}) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [data, setData] = useState({});

  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const currentUrlRef = useRef(url);

  const {
    maxReconnectAttempts = 10,
    reconnectInterval = 3000,
    maxMessages = 1000,
    messageRetention = 500,
    autoRequestState = true,
    enableMessageHistory = true
  } = config;

  const connect = useCallback(() => {
    if (['connecting', 'connected'].includes(connectionStatus)) return;

    setError(null);
    setConnectionStatus('connecting');

    const websocket = new WebSocket(currentUrlRef.current);

    websocket.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      setWs(websocket);
      reconnectAttemptsRef.current = 0;

      // Request initial state when connected
      if (autoRequestState) {
        setTimeout(() => {
          sendRawMessage({ type: 'request_state' });
        }, 100);
      }
    };

    websocket.onclose = (event) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');

      !event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts && (
        setConnectionStatus('reconnecting'),
        reconnectAttemptsRef.current++,
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
      );
    };

    websocket.onerror = () => {
      setError({ message: 'Connection failed', timestamp: new Date().toISOString() });
      setConnectionStatus('disconnected');
    };

    websocket.onmessage = (event) => {
      setLastMessage(event);

      if (enableMessageHistory) {
        event.data instanceof Blob
          ? setMessages(prev => [...prev, { type: 'binary', data: event.data }])
          : (() => {
              try {
                const data = JSON.parse(event.data);
                setMessages(prev => [...prev, data]);
              } catch (e) {
                setMessages(prev => [...prev, { type: 'error', data: event.data, error: e.message }]);
              }
            })();
      }

      // Handle server responses for state synchronization
      try {
        const rawData = event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : event.data instanceof Blob
            ? (() => { const reader = new FileReader(); reader.onload = () => {
                try {
                  const message = JSON.parse(reader.result);
                  handleServerMessage(message);
                } catch (parseError) {
                  console.error('Error parsing WebSocket message:', parseError);
                }
              }; reader.readAsText(event.data); return; })()
            : event.data;

        if (rawData) {
          try {
            const message = JSON.parse(rawData);
            handleServerMessage(message);
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError);
          }
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
  }, [connectionStatus, maxReconnectAttempts, reconnectInterval, autoRequestState, enableMessageHistory]);

  const handleServerMessage = useCallback((message) => {
    if (message.type === 'state_update' && message.payload) {
      const { tasks, concepts, logs, stats } = message.payload;
      setData(prev => ({
        ...prev,
        tasks: tasks || prev.tasks || [],
        concepts: concepts || prev.concepts || [],
        logs: logs || prev.logs || [],
        reasonerStats: stats || prev.reasonerStats
      }));
    } else if (message.type === 'concepts_update' && message.payload) {
      setData(prev => ({
        ...prev,
        concepts: message.payload || []
      }));
    } else if (message.type === 'top_tasks_update' && message.payload) {
      setData(prev => ({
        ...prev,
        memoryTasks: message.payload || []
      }));
    }
  }, []);

  const sendRawMessage = useCallback((message) => {
    if (ws && isConnected) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending raw message:', error);
        return false;
      }
    }
    return false;
  }, [ws, isConnected]);

  const sendMessage = useCallback((command, payload = {}) => {
    return sendRawMessage({ type: 'control', command, payload });
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

  const requestTopTasks = useCallback(() => {
    sendMessage('get_top_tasks');
  }, [sendMessage]);

  const requestState = useCallback(() => {
    sendRawMessage({ type: 'request_state' });
  }, [sendRawMessage]);

  const disconnect = useCallback(() => {
    reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
    ws?.close(1000, "Manual disconnect");
    setError(null);
    setConnectionStatus('disconnected');
    setIsConnected(false);
  }, [ws]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    currentUrlRef.current = url;

    if (isConnected && ws) {
      disconnect();
      setTimeout(connect, 100);
    } else if (connectionStatus === 'disconnected') {
      connect();
    }

    return () => {
      reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
      disconnect();
    };
  }, [url]);

  useEffect(() => {
    if (enableMessageHistory) {
      messages.length > maxMessages && setMessages(prev => prev.slice(-messageRetention));
    }
  }, [messages, maxMessages, messageRetention, enableMessageHistory]);

  const sortedTasks = [...(data.tasks || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return {
    // Connection state
    isConnected,
    connectionStatus,
    error: error || (connectionStatus === 'error' ? 'WebSocket connection error' : null),

    // Message history (if enabled)
    messages: enableMessageHistory ? messages : [],
    lastMessage,

    // Application data
    tasks: sortedTasks,
    logs: data.logs || [],
    concepts: data.concepts || [],
    memoryTasks: data.memoryTasks || [], // Top tasks from Memory
    reasonerStats: data.reasonerStats || null,

    // Actions
    sendRawMessage,
    sendMessage,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    requestConcepts,
    requestTopTasks,
    requestState,
    reconnect,
    disconnect,

    // Status
    reconnectAttempts: reconnectAttemptsRef.current
  };
};

export default useWebSocket;