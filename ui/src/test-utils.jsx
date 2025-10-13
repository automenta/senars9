// Test utilities for SeNARS UI components
import React from 'react';
import { render, screen } from '@testing-library/react';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';
import { vi } from 'vitest';

// Mock WebSocket provider for testing
export const mockWebSocketProvider = (mockData = {}) => {
  const mockProvider = {
    ws: {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    },
    disconnect: vi.fn(),
    awareness: {
      on: vi.fn(),
      off: vi.fn(),
      getStates: vi.fn(() => new Map()),
    },
  };
  
  return mockProvider;
};

// Mock Yjs document for testing
export const createMockYDoc = () => {
  const mockArray = {
    toArray: jest.fn(() => []),
    observe: jest.fn(),
    unobserve: jest.fn(),
  };
  
  return {
    getArray: jest.fn(() => mockArray),
  };
};

// Wrapper component for testing with contexts
export const TestWrapper = ({ children, mockProvider = null }) => {
  return (
    <UIProvider>
      <NotificationProvider>
        <div>
          {children}
        </div>
      </NotificationProvider>
    </UIProvider>
  );
};

// Render with error detection
export const renderWithErrorDetection = (component) => {
  const errors = [];
  const originalError = console.error;
  
  const mockError = vi.fn((...args) => {
    errors.push(args.join(' '));
    originalError(...args);
  });
  
  console.error = mockError;
  
  const result = render(component, {
    wrapper: TestWrapper
  });
  
  const expectNoErrors = () => {
    expect(errors).toHaveLength(0);
  };
  
  const cleanup = () => {
    console.error = originalError;
  };
  
  // Add cleanup to the result object
  result.cleanup = cleanup;
  
  return {
    ...result,
    expectNoErrors,
    cleanup
  };
};

// Create mock WebSocket
export const createWebSocketMock = (mockData = {}) => {
  const mockWebSocket = {
    readyState: mockData.readyState || WebSocket.OPEN,
    send: jest.fn(),
    close: jest.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    ...mockData
  };
  
  return mockWebSocket;
};

// Common test utilities
export const waitForComponentToRender = async (text) => {
  return screen.findByText(text);
};

export const getTaskByText = (text) => {
  return screen.getByText(text).closest('.task-item');
};

// Mock data creators
export const createMockStats = () => ({
  concepts: 10,
  tasks: 5,
  cycles: 100,
  running: true,
  paused: false
});

export const createMockLogs = () => [
  { timestamp: Date.now(), level: 'info', message: 'Test log message' }
];

export const createMockTasks = () => [
  { id: 'task1', content: 'Test task', priority: 0.5, timestamp: Date.now() }
];