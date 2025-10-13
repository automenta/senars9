// Test utilities for SeNARS UI components
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock WebSocket provider for testing
export const mockWebSocketProvider = (mockData = {}) => {
  const mockProvider = {
    ws: {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
    },
    disconnect: jest.fn(),
    awareness: {
      on: jest.fn(),
      off: jest.fn(),
      getStates: jest.fn(() => new Map()),
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
    <div>
      {children}
    </div>
  );
};

// Common test utilities
export const waitForComponentToRender = async (text) => {
  return screen.findByText(text);
};

export const getTaskByText = (text) => {
  return screen.getByText(text).closest('.task-item');
};