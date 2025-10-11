import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

// Mock console.error to detect errors during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('App Component - Runtime Error Tests', () => {
  let consoleErrorSpy, consoleWarnSpy;

  beforeEach(() => {
    // Spy on console methods to capture any errors or warnings
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders without fatal console errors', async () => {
    // Render the app
    const { container } = render(<App />);
    
    // Wait for any potential async operations
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
    
    // Check that no errors were logged to console during rendering
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    
    // Verify the app container is in the document
    expect(screen.getByTestId('app-container')).toBeInTheDocument();
  });

  it('renders connection tabs without runtime errors', async () => {
    render(<App />);
    
    // Wait for potential async operations
    await waitFor(() => {
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });
    
    // Verify no console errors occurred
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    // Check for the default title
    expect(screen.getByText('SeNARS UI')).toBeInTheDocument();
  });

  it('handles WebSocket connection errors gracefully', async () => {
    // Mock WebSocket constructor to simulate connection errors
    const originalWebSocket = global.WebSocket;
    global.WebSocket = vi.fn(() => ({
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
      send: vi.fn(),
      readyState: 0
    }));

    try {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('app-container')).toBeInTheDocument();
      });
      
      // Check that no errors were logged during rendering
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      // Restore original WebSocket
      global.WebSocket = originalWebSocket;
    }
  });

  it('handles component prop updates without errors', async () => {
    const { rerender } = render(<App />);
    
    // Rerender multiple times to ensure stability
    for (let i = 0; i < 5; i++) {
      rerender(<App />);
    }
    
    await waitFor(() => {
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });
    
    // Check that no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

// Test individual components
describe('Individual Component Runtime Error Tests', () => {
  let consoleErrorSpy, consoleWarnSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('ReasonerControlPanel handles null stats gracefully', () => {
    const { ReasonerControlPanel } = require('./components/ReasonerControlPanel');
    const { render } = require('@testing-library/react');
    
    render(<ReasonerControlPanel stats={null} />);
    
    // Verify no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('LogList handles empty logs gracefully', () => {
    const { default: LogList } = require('./components/LogList');
    const { render } = require('@testing-library/react');
    
    render(<LogList logs={[]} />);
    
    // Verify no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('TasksTree handles empty tasks gracefully', () => {
    const { default: TasksTree } = require('./components/TasksTree');
    const { render } = require('@testing-library/react');
    
    render(<TasksTree tasks={[]} />);
    
    // Verify no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('InputField renders without errors', () => {
    const { default: InputField } = require('./components/InputField');
    const { render } = require('@testing-library/react');
    
    render(<InputField onSend={() => {}} />);
    
    // Verify no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});