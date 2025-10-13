/**
 * Custom hooks for common UI patterns
 */

import { useState, useCallback } from 'react';
import { CONNECTION_DEFAULTS } from '../constants';

/**
 * Hook for managing command/input history with up/down navigation
 */
export const useCommandHistory = (maxSize = CONNECTION_DEFAULTS.maxHistorySize) => {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1); // -1 means not in history

  const addToHistory = useCallback((command) => {
    if (command && command !== history[0]) {
      const newHistory = [command, ...history];
      setHistory(newHistory.slice(0, maxSize));
    }
    setHistoryIndex(-1);
  }, [history, maxSize]);

  const navigateHistory = useCallback((direction) => {
    if (history.length === 0) return null;

    let newIndex;
    if (direction === 'up') {
      newIndex = Math.min(historyIndex + 1, history.length - 1);
    } else if (direction === 'down') {
      if (historyIndex <= 0) {
        newIndex = -1;
        return null; // Return to empty input
      }
      newIndex = historyIndex - 1;
    }

    setHistoryIndex(newIndex);
    return history[newIndex] || null;
  }, [history, historyIndex]);

  const resetHistoryNavigation = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    historyIndex,
    addToHistory,
    navigateHistory,
    resetHistoryNavigation
  };
};

/**
 * Hook for managing controlled input state with history
 */
export const useInputWithHistory = (maxSize = CONNECTION_DEFAULTS.maxHistorySize) => {
  const [inputValue, setInputValue] = useState('');
  const { 
    history, 
    addToHistory, 
    navigateHistory, 
    resetHistoryNavigation 
  } = useCommandHistory(maxSize);

  const handleSubmit = useCallback((onSubmit) => {
    if (inputValue.trim()) {
      onSubmit(inputValue);
      addToHistory(inputValue);
      setInputValue('');
      resetHistoryNavigation();
    }
  }, [inputValue, addToHistory, resetHistoryNavigation]);

  const handleArrowNavigation = useCallback((e) => {
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
    }
  }, [navigateHistory]);

  return {
    inputValue,
    setInputValue,
    history,
    handleSubmit,
    handleArrowNavigation,  // Separate from tab handling
    addToHistory
  };
};