import React, { useState } from 'react';

// A basic set of Narsese operators and punctuation for autocomplete
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

      // Add to history if it's a new command
      if (inputValue !== history[0]) {
        const newHistory = [inputValue, ...history];
        setHistory(newHistory.slice(0, 50)); // Keep only last 50 entries
      }

      setHistoryIndex(-1); // Reset history index
      setInputValue(''); // Clear input after sending
    }
  };

  const handleKeyDown = (e) => {
    // Command History Navigation
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
    }
    // Autocomplete
    else if (e.key === 'Tab') {
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
    <div className="input-field" style={{
      display: 'flex',
      flexDirection: 'column',
      marginTop: '10px'
    }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command or narsese... (Tab for autocomplete)"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            autoFocus
          />
        </form>
        <button
          type="submit"
          onClick={handleSubmit}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </div>

      {/* History indicator */}
      {history.length > 0 && (
        <div style={{
          marginTop: '5px',
          fontSize: '12px',
          color: '#666',
          fontStyle: 'italic'
        }}>
          History: {history.length} entries (use ↑/↓ to navigate)
        </div>
      )}
    </div>
  );
};

export default InputField;
