import React, { useState } from 'react';
import { CONNECTION_DEFAULTS } from '../constants';
import { createLayout } from '../utils/styling';
import { createButtonStyle, createInputGroupStyle, createInputStyle } from '../utils/componentPatterns';

const NARSESE_SUGGESTIONS = [...new Set([
  '-->', '==>', '<=>',
  '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']',
  '.', '!', '?'
])];

const StatusBar = ({ onSend, stats }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSend(inputValue);
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

  const handleControlCommand = (command) => {
    onSend(command);
  };

  const statusBarStyle = createLayout('flex', {
    align: 'center',
    overrides: {
      padding: '5px',
      backgroundColor: '#f0f0f0',
      gap: '10px'
    }
  });

  const controlsGroupStyle = createLayout('flex', {
    gap: '5px',
    overrides: { marginRight: '10px' }
  });

  const statsGroupStyle = createLayout('flex', {
    gap: '10px',
    overrides: { marginRight: '10px' }
  });

  const inputGroupStyle = createInputGroupStyle();
  const controlButtonStyle = createButtonStyle('secondary', 'sm');
  const inputStyle = createInputStyle('sm');

  return (
    <div className="status-bar" style={statusBarStyle}>
      <div style={controlsGroupStyle}>
        <button onClick={() => handleControlCommand('start')} style={controlButtonStyle}>Start</button>
        <button onClick={() => handleControlCommand('stop')} style={controlButtonStyle}>Stop</button>
        <button onClick={() => handleControlCommand('reset')} style={controlButtonStyle}>Reset</button>
      </div>
      <div style={{ marginRight: '10px' }}>
        <span>Status: {stats?.running ? 'Running' : 'Stopped'}</span>
      </div>
      <div style={statsGroupStyle}>
        <span>Concepts: {stats?.concepts || 0}</span>
        <span>Tasks: {stats?.tasks || 0}</span>
        <span>Cycles: {stats?.cycles || 0}</span>
      </div>
      <form onSubmit={handleSubmit} style={inputGroupStyle}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          style={inputStyle}
        />
        <button type="submit" style={createButtonStyle('primary', 'sm')}>Send</button>
      </form>
    </div>
  );
};

export default StatusBar;
