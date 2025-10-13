import React from 'react';
import { useInputWithHistory } from '../utils/hooks';

const NARSESE_SUGGESTIONS = [...new Set([
  '-->', '==>', '<=>',
  '&/', '&|', '&&', '||', '--', '~~',
  '<', '>', '(', ')', '{', '}', '[', ']',
  '.', '!', '?'
])];

const InputField = ({ onSend }) => {
  const {
    inputValue,
    setInputValue,
    history,
    handleSubmit: handleFormSubmit,
    handleArrowNavigation
  } = useInputWithHistory();

  const handleSubmit = (e) => {
    e.preventDefault();
    handleFormSubmit(onSend);
  };

  const handleKeyDown = (e) => {
    // Handle arrow navigation via the hook
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      handleArrowNavigation(e);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = inputValue.split(/(\\s+)/); // Split by space, keeping delimiter
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