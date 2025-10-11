import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ReasonerControlPanel = ({ stats }) => {
  const [cpuThrottle, setCpuThrottle] = useState(100); // Default to 100%
  const [chartData, setChartData] = useState([]);

  // Simulate updating chart data for visualization
  useEffect(() => {
    const interval = setInterval(() => {
      if (stats) {
        const now = new Date().toLocaleTimeString();
        const newPoint = {
          time: now,
          concepts: stats.concepts || 0,
          tasks: stats.tasks || 0,
          cycles: stats.cycles || 0
        };

        setChartData(prev => {
          // Keep only last 20 data points
          const updated = [...prev, newPoint];
          return updated.slice(-20);
        });
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [stats]);

  const handleCpuThrottleChange = (e) => {
    setCpuThrottle(parseInt(e.target.value));
    // In a real implementation, this would send throttle command to the backend
  };

  const handleControlCommand = (command) => {
    // In a real implementation, this would send the command to the backend
    console.log(`Sending command: ${command}`);
  };

  return (
    <div className="reasoner-control-panel" style={{
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      marginBottom: '10px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Reasoner Control</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Control:
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => handleControlCommand('start')}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Start
              </button>
              <button
                onClick={() => handleControlCommand('stop')}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Stop
              </button>
              <button
                onClick={() => handleControlCommand('reset')}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#ffc107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              CPU Throttle: {cpuThrottle}%
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={cpuThrottle}
              onChange={handleCpuThrottleChange}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Status:
            <span style={{
              marginLeft: '10px',
              padding: '2px 8px',
              backgroundColor: stats?.running ? '#d4edda' : '#f8d7da',
              color: stats?.running ? '#155724' : '#721c24',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {stats?.running ? 'Running' : 'Stopped'}
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
            <div style={{ padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{stats?.concepts || 0}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Concepts</div>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>{stats?.tasks || 0}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Tasks</div>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc107' }}>{stats?.cycles || 0}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Cycles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated chart for metrics */}
      <div style={{ marginTop: '15px', height: '120px' }}>
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