import React, { useState } from 'react';

const InputField = ({ onSend }) => {
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSend(inputValue);
      
      // Add to history
      const newHistory = [inputValue, ...history];
      setHistory(newHistory.slice(0, 50)); // Keep only last 50 entries
      
      setHistoryIndex(-1); // Reset history index
      setInputValue(''); // Clear input after sending
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      // Navigate up through history
      if (history.length > 0) {
        let newIndex = historyIndex + 1;
        if (newIndex >= history.length) newIndex = history.length - 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      // Navigate down through history
      if (historyIndex > 0) {
        let newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
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
            placeholder="Enter command or narsese..."
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
          formNoValidate
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
          History: {history.length} entries (use ↑/↓ arrows to navigate)
        </div>
      )}
    </div>
  );
};

export default InputField;