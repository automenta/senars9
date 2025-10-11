import React, { useState } from 'react';
import { CONNECTION_DEFAULTS } from '../constants';

const NARSESE_SUGGESTIONS = [...new Set([
  '-->', '==>', '<=>',
  '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']',
  '.', '!', '?'
])];

const InputField = ({ onSend }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1); // -1 means new input, not from history

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
      const parts = inputValue.split(/(\s+)/); // Split by space, keeping delimiter
      const lastPart = parts[parts.length - 1];

      if (lastPart.trim()) { // Don't autocomplete on spaces
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
    <div className="input-field">
      <div className="input-row">
        <form className="input-form" onSubmit={handleSubmit}>
          <input
            className="input-text"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command or narsese... (Tab for autocomplete)"
            autoFocus
          />
        </form>
        <button
          className="send-button"
          type="submit"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>

      {history.length > 0 && (
        <div className="history-indicator">
          History: {history.length} entries (use ↑/↓ to navigate)
        </div>
      )}
    </div>
  );
};

export default InputField;
