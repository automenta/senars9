import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CONNECTION_DEFAULTS } from '../constants';
import { useUI } from '../core/UIContext';
import { useNotification } from '../core/NotificationSystem';
import { useCommandHistory } from '../utils/hooks';
import { panelContainerStyle, headerStyle, labelStyle, buttonStyle, inputStyle, statBoxStyle, statusBadgeStyle } from '../utils/styling';

const NARSESE_SUGGESTIONS = [...new Set([
  '-->', '==>', '<=>',
  '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']',
  '.', '!', '?'
])];

const ReasonerControlPanel = ({ stats, onCommand, onAddTask }) => {
  const { config } = useUI();
  const { addNotification } = useNotification();
  const controlConfig = config?.controlPanel || {};
  
  const [inputValue, setInputValue] = useState('');
  const [cpuThrottle, setCpuThrottle] = useState(controlConfig.defaultThrottle || 100);
  const [chartData, setChartData] = useState([]);
  
  const { 
    history, 
    addToHistory, 
    navigateHistory, 
    resetHistoryNavigation 
  } = useCommandHistory();

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
    addNotification(`CPU throttle set to ${value}%`, 'info');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      if (inputValue.startsWith('/cmd')) {
        // This is a command, send it via onCommand
        const command = inputValue.slice(5).trim();
        // Extract potential payload from command if present in format: command payload
        const [cmd, ...args] = command.split(' ');
        if (args.length > 0) {
          onCommand(cmd, { payload: args.join(' ') });
          addNotification(`Command '${cmd}' executed with payload`, 'info');
        } else {
          onCommand(cmd);
          addNotification(`Command '${cmd}' executed`, 'info');
        }
      } else {
        // This is a task, add it via onAddTask
        if (onAddTask) {
          onAddTask({ content: inputValue, priority: 0.5 });
          addNotification(`Task added: ${inputValue.substring(0, 30)}${inputValue.length > 30 ? '...' : ''}`, 'success');
        } else {
          // Fallback to command if onAddTask is not provided
          onCommand('add_task', { content: inputValue, priority: 0.5 });
          addNotification(`Task added via command: ${inputValue.substring(0, 30)}${inputValue.length > 30 ? '...' : ''}`, 'success');
        }
      }
      addToHistory(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const historyValue = navigateHistory('up');
      if (historyValue !== null) {
        setInputValue(historyValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const historyValue = navigateHistory('down');
      setInputValue(historyValue || '');
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



  return (
    <div className="reasoner-control-panel" style={{...panelContainerStyle({ marginBottom: '10px' }), border: '1px solid #ccc' }}>
      <h3 style={headerStyle({ margin: '0 0 10px 0', color: '#333' })}>Reasoner Control</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {controlConfig.showStartButton || controlConfig.showStopButton || controlConfig.showStepButton || controlConfig.showResetButton ? (
            <div>
              <label style={labelStyle()}>Control:</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                {controlConfig.showStartButton && (
                  <button 
                    onClick={() => {
                      onCommand('start');
                      addNotification('Reasoner started', 'success');
                    }} 
                    style={{...buttonStyle('success'), padding: '5px 10px', borderRadius: '3px'}}
                  >
                    Start
                  </button>
                )}
                {controlConfig.showStopButton && (
                  <button 
                    onClick={() => {
                      onCommand('stop');
                      addNotification('Reasoner stopped', 'info');
                    }} 
                    style={{...buttonStyle('danger'), padding: '5px 10px', borderRadius: '3px'}}
                  >
                    Stop
                  </button>
                )}
                {controlConfig.showStepButton && (
                  <button 
                    onClick={() => {
                      onCommand('step');
                      addNotification('Single cognitive cycle executed', 'info');
                    }} 
                    style={{...buttonStyle('info'), padding: '5px 10px', borderRadius: '3px'}}
                  >
                    Step
                  </button>
                )}
                {controlConfig.showResetButton && (
                  <button 
                    onClick={() => {
                      onCommand('reset');
                      addNotification('System reset completed', 'info');
                    }} 
                    style={{...buttonStyle('warning'), padding: '5px 10px', borderRadius: '3px'}}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ) : null}
          {controlConfig.showThrottleControl && (
            <div>
              <label style={labelStyle()}>CPU Throttle: {cpuThrottle}%</label>
              <input type="range" min="1" max="100" value={cpuThrottle} onChange={handleCpuThrottleChange} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                <span>1%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>
        {controlConfig.showStats && (
          <div>
            <label style={labelStyle()}>
              Status:
              <span style={{
                marginLeft: '10px',
                padding: '2px 8px',
                backgroundColor: stats?.running && !stats?.paused ? '#d4edda' : 
                                stats?.paused ? '#fff3cd' : '#f8d7da',
                color: stats?.running && !stats?.paused ? '#155724' : 
                       stats?.paused ? '#856404' : '#721c24',
                borderRadius: '12px',
                fontSize: '12px',
              }}>
                {stats?.running && !stats?.paused ? 'Running' : 
                 stats?.paused ? 'Paused' : 'Stopped'}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
              <div style={{...statBoxStyle({ textAlign: 'center', padding: '8px', backgroundColor: '#e9ecef' })}}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#007bff' }}>{stats?.concepts || 0}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Concepts</div>
              </div>
              <div style={{...statBoxStyle({ textAlign: 'center', padding: '8px', backgroundColor: '#e9ecef' })}}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>{stats?.tasks || 0}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Tasks</div>
              </div>
              <div style={{...statBoxStyle({ textAlign: 'center', padding: '8px', backgroundColor: '#e9ecef' })}}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffc107' }}>{stats?.cycles || 0}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Cycles</div>
              </div>
            </div>
          </div>
        )}
      </div>
      {controlConfig.showChart && (
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
      )}
      {controlConfig.showInputField && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', marginTop: '10px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a command or task (e.g. /cmd start)..."
            style={{...inputStyle(), flex: 1, padding: '5px', marginRight: '5px', border: '1px solid #ccc', borderRadius: '3px'}}
          />
          <button type="submit" style={{...buttonStyle('primary'), padding: '5px 10px', borderRadius: '3px'}}>Send</button>
        </form>
      )}
    </div>
  );
};

export default ReasonerControlPanel;