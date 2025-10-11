import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useWebSocket hook
vi.mock('../core/WebSocketManager', async () => {
  const actual = await vi.importActual('../core/WebSocketManager');
  return {
    ...actual,
    useWebSocket: vi.fn(() => ({
      isConnected: true,
      messages: [],
      sendMessage: vi.fn(),
      reconnect: vi.fn(),
      disconnect: vi.fn(),
      reconnectAttempts: 0
    }))
  };
});

// Import the connection tab after mocking
import ConnectionTab from './ConnectionTab.jsx';

// Mock console methods to detect errors
let consoleErrorSpy, consoleWarnSpy;

describe('ConnectionTab Runtime Error Tests', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('renders ConnectionTab without fatal console errors', () => {
    render(
      <ConnectionTab 
        name="Test Connection" 
        url="ws://localhost:8080" 
      />
    );

    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles WebSocket messages without errors', () => {
    // Mock the useWebSocket hook to return test data
    vi.doMock('../core/WebSocketManager', () => ({
      default: vi.fn(() => ({
        isConnected: true,
        messages: [
          { type: 'log', data: 'Test log message', timestamp: Date.now() },
          { type: 'task', data: { id: 'task1', content: 'Test task', priority: 0.8 } },
          { type: 'concept', data: { id: 'concept1', name: 'Test concept', priority: 0.5 } }
        ],
        sendMessage: vi.fn(),
        reconnect: vi.fn(),
        disconnect: vi.fn(),
        reconnectAttempts: 0
      }))
    }));

    const ConnectionTabMocked = require('./ConnectionTab.jsx').default;

    render(
      <ConnectionTabMocked
        name="Test Connection"
        url="ws://localhost:8080"
      />
    );

    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles disconnection state without errors', () => {
    // Mock the useWebSocket hook to return disconnected state
    vi.doMock('../core/WebSocketManager', () => ({
      default: vi.fn(() => ({
        isConnected: false,
        messages: [],
        sendMessage: vi.fn(),
        reconnect: vi.fn(),
        disconnect: vi.fn(),
        reconnectAttempts: 0
      }))
    }));

    const ConnectionTabMocked = require('./ConnectionTab.jsx').default;

    render(
      <ConnectionTabMocked
        name="Test Connection"
        url="ws://localhost:8080"
      />
    );

    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});