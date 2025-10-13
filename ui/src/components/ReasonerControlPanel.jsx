import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CONNECTION_DEFAULTS } from '../constants';

const NARSESE_SUGGESTIONS = [...new Set([
  '-->', '==>', '<=>',
  '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']',
  '.', '!', '?'
])];

const ReasonerControlPanel = ({ stats, onCommand, onAddTask }) => {
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
        // This is a command, send it via onCommand
        onCommand(inputValue.slice(5).trim()); // Remove '/cmd ' prefix and send command
      } else {
        // This is a task, add it via onAddTask
        if (onAddTask) {
          onAddTask({ content: inputValue, priority: 0.5 });
        } else {
          // Fallback to command if onAddTask is not provided
          onCommand('add_task', { content: inputValue, priority: 0.5 });
        }
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
      const parts = inputValue.split(/(\s+)/);
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

  const styles = {
    container: {
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      marginBottom: '10px',
    },
    header: { margin: '0 0 10px 0', color: '#333' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    column: { display: 'flex', flexDirection: 'column', gap: '10px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    buttonContainer: { display: 'flex', gap: '5px' },
    button: (color, bg) => ({
      padding: '5px 10px',
      backgroundColor: bg,
      color: color,
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
    }),
    throttleContainer: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' },
    statusBadge: {
      marginLeft: '10px',
      padding: '2px 8px',
      backgroundColor: stats?.running && !stats?.paused ? '#d4edda' : 
                      stats?.paused ? '#fff3cd' : '#f8d7da',
      color: stats?.running && !stats?.paused ? '#155724' : 
             stats?.paused ? '#856404' : '#721c24',
      borderRadius: '12px',
      fontSize: '12px',
    },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' },
    statBox: { padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', textAlign: 'center' },
    statValue: (color) => ({ fontSize: '14px', fontWeight: 'bold', color }),
    statLabel: { fontSize: '12px', color: '#666' },
    chartContainer: { marginTop: '15px', height: '120px' },
    form: { display: 'flex', marginTop: '10px' },
    inputField: { 
      flex: 1, 
      padding: '5px',
      border: '1px solid #ccc',
      borderRadius: '3px',
      marginRight: '5px'
    },
    sendButton: {
      padding: '5px 10px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
    }
  };

  return (
    <div className="reasoner-control-panel" style={styles.container}>
      <h3 style={styles.header}>Reasoner Control</h3>
      <div style={styles.grid}>
        <div style={styles.column}>
          <div>
            <label style={styles.label}>Control:</label>
            <div style={styles.buttonContainer}>
              <button onClick={() => onCommand('start')} style={styles.button('white', '#28a745')}>Start</button>
              <button onClick={() => onCommand('stop')} style={styles.button('white', '#dc3545')}>Stop</button>
              <button onClick={() => onCommand('step')} style={styles.button('white', '#17a2b8')}>Step</button>
              <button onClick={() => onCommand('reset')} style={styles.button('black', '#ffc107')}>Reset</button>
            </div>
          </div>
          <div>
            <label style={styles.label}>CPU Throttle: {cpuThrottle}%</label>
            <input type="range" min="1" max="100" value={cpuThrottle} onChange={handleCpuThrottleChange} style={{ width: '100%' }} />
            <div style={styles.throttleContainer}>
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        <div>
          <label style={styles.label}>
            Status:
            <span style={styles.statusBadge}>
              {stats?.running && !stats?.paused ? 'Running' : 
               stats?.paused ? 'Paused' : 'Stopped'}
            </span>
          </label>
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue('#007bff')}>{stats?.concepts || 0}</div>
              <div style={styles.statLabel}>Concepts</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue('#28a745')}>{stats?.tasks || 0}</div>
              <div style={styles.statLabel}>Tasks</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue('#ffc107')}>{stats?.cycles || 0}</div>
              <div style={styles.statLabel}>Cycles</div>
            </div>
          </div>
        </div>
      </div>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="concepts" stroke="#007bff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tasks" stroke="#28a745" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a command or task (e.g. /cmd start)..."
          style={styles.inputField}
        />
        <button type="submit" style={styles.sendButton}>Send</button>
      </form>
    </div>
  );
};

export default ReasonerControlPanel;