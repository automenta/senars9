import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ReasonerControlPanel = ({ stats, onCommand }) => {
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
      backgroundColor: stats?.running ? '#d4edda' : '#f8d7da',
      color: stats?.running ? '#155724' : '#721c24',
      borderRadius: '12px',
      fontSize: '12px',
    },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' },
    statBox: { padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', textAlign: 'center' },
    statValue: (color) => ({ fontSize: '14px', fontWeight: 'bold', color }),
    statLabel: { fontSize: '12px', color: '#666' },
    chartContainer: { marginTop: '15px', height: '120px' },
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
            <span style={styles.statusBadge}>{stats?.running ? 'Running' : 'Stopped'}</span>
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
    </div>
  );
};

export default ReasonerControlPanel;