import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CONNECTION_DEFAULTS } from '../constants';

const NARSESE_SUGGESTIONS = [...new Set([
  '-->', '==>', '<=>',
  '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']',
  '.', '!', '?'
])];

const UnifiedMenuBar = ({ stats, connectionStatus, onCommand, onAddTask }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cpuThrottle, setCpuThrottle] = useState(100);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stats) {
        const now = new Date().toLocaleTimeString();
        const newPoint = {
          time: now,
          concepts: stats.concepts || 0,
          tasks: stats.tasks || 0,
          cycles: stats.cycles || 0,
        };
        setChartData(prev => [...prev, newPoint].slice(-20));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  const handleCpuThrottleChange = (e) => {
    const value = parseInt(e.target.value);
    setCpuThrottle(value);
    onCommand('throttle', { value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      if (inputValue.startsWith('/cmd')) {
        onCommand(inputValue.slice(5));
      } else {
        onAddTask({ text: inputValue, priority: 0.5 });
      }
      if (inputValue !== history[0]) {
        const newHistory = [inputValue, ...history];
        setHistory(newHistory.slice(0, CONNECTION_DEFAULTS.maxHistorySize));
      }
      setHistoryIndex(-1);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > -1) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex] || '');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = inputValue.split(/(\\s+)/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.trim()) {
        const match = NARSESE_SUGGESTIONS.find(s => s.startsWith(lastPart));
        if (match) {
          parts[parts.length - 1] = match;
          const newValue = parts.join('');
          setInputValue(newValue);
        }
      }
    }
  };

  const getConnectionStatusStyle = () => {
    switch (connectionStatus) {
      case 'Connected':
        return { backgroundColor: '#d4edda', color: '#155724' };
      case 'Disconnected':
        return { backgroundColor: '#f8d7da', color: '#721c24' };
      case 'Connecting':
        return { backgroundColor: '#fff3cd', color: '#856404' };
      default:
        return { backgroundColor: '#e2e3e5', color: '#383d41' };
    }
  };

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #ccc',
    },
    buttonContainer: { display: 'flex', gap: '5px' },
    button: (color, bg) => ({
      padding: '5px 10px',
      backgroundColor: bg,
      color: color,
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
    }),
    statusBadge: {
      marginLeft: '10px',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      ...getConnectionStatusStyle(),
    },
    statsContainer: { display: 'flex', gap: '10px', marginRight: '10px' },
    chartContainer: { width: '200px', height: '40px' },
    form: { flex: 1, display: 'flex' },
  };

  return (
    <div className="unified-menu-bar" style={styles.container}>
      <div style={styles.buttonContainer}>
        <button onClick={() => onCommand('start')} style={styles.button('white', '#28a745')}>Start</button>
        <button onClick={() => onCommand('stop')} style={styles.button('white', '#dc3545')}>Stop</button>
        <button onClick={() => onCommand('reset')} style={styles.button('black', '#ffc107')}>Reset</button>
      </div>
       <div style={styles.statusBadge}>
        {connectionStatus}
      </div>
      <div>
        <label>CPU: {cpuThrottle}%</label>
        <input type="range" min="1" max="100" value={cpuThrottle} onChange={handleCpuThrottleChange} />
      </div>
      <div style={styles.statsContainer}>
        <span>Concepts: {stats?.concepts || 0}</span>
        <span>Tasks: {stats?.tasks || 0}</span>
        <span>Cycles: {stats?.cycles || 0}</span>
      </div>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="concepts" stroke="#007bff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tasks" stroke="#28a745" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.g. /cmd start)..."
          style={{ flex: 1 }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default UnifiedMenuBar;
