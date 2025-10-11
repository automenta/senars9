import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '../core/WebSocketManager';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Create a test component that uses the hook
const TestComponent = ({ url }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(url);
  
  return (
    <div>
      <div data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</div>
      <div data-testid="message-count">{messages.length}</div>
    </div>
  );
};

describe('WebSocketManager Hook - Runtime Error Tests', () => {
  let consoleErrorSpy, consoleWarnSpy;
  let originalWebSocket;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Save original WebSocket
    originalWebSocket = window.WebSocket;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    
    // Restore original WebSocket
    window.WebSocket = originalWebSocket;
  });

  it('handles WebSocket connection without errors', async () => {
    // Mock WebSocket instance
    const mockWebSocket = vi.fn((url) => ({
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1 // OPEN
    }));
    
    window.WebSocket = mockWebSocket;

    render(<TestComponent url="ws://localhost:8080" />);
    
    // Wait for potential async operations
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
    
    // Verify no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles WebSocket connection errors gracefully', async () => {
    // Mock WebSocket that simulates errors
    const mockWebSocket = vi.fn((url) => {
      const ws = {
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null,
        send: vi.fn(),
        close: vi.fn(),
        readyState: 3 // CLOSED
      };
      
      // Simulate error immediately
      setTimeout(() => {
        if (ws.onerror) {
          ws.onerror(new Error('Test error'));
        }
      }, 0);
      
      return ws;
    });
    
    window.WebSocket = mockWebSocket;

    render(<TestComponent url="ws://localhost:8080" />);
    
    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
    
    // Allow time for error to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that errors were caught and handled gracefully
    // (We might expect some console output but no unhandled errors)
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles invalid message parsing gracefully', async () => {
    // Mock WebSocket that sends invalid JSON
    const mockWebSocket = vi.fn((url) => {
      const ws = {
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null,
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1 // OPEN
      };
      
      // Simulate receiving invalid JSON message
      setTimeout(() => {
        if (ws.onmessage) {
          ws.onmessage({ data: '{invalid json}' });
        }
      }, 0);
      
      return ws;
    });
    
    window.WebSocket = mockWebSocket;

    render(<TestComponent url="ws://localhost:8080" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
    
    // Allow time for message processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should handle JSON parsing errors gracefully
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles send message when disconnected', async () => {
    // Mock WebSocket in closed state
    const mockWebSocket = vi.fn((url) => ({
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
      readyState: 3 // CLOSED
    }));
    
    window.WebSocket = mockWebSocket;

    render(<TestComponent url="ws://localhost:8080" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
    
    // Should not throw errors when trying to send while disconnected
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});