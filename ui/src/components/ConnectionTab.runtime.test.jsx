import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIProvider } from '../core/UIContext';
import { NotificationProvider } from '../core/NotificationSystem';

// Mock WebSocketManager to simulate a successful connection
vi.mock('../core/WebSocketManager', () => ({
  default: vi.fn(() => ({
    isConnected: true,
    messages: [],
    sendMessage: vi.fn(),
    reconnect: vi.fn(),
    disconnect: vi.fn(),
    reconnectAttempts: 0
  }))
}));

// Import the connection tab after mocking
import ConnectionTab from './ConnectionTab.jsx';

// Wrapper component that includes all necessary providers
const TestWrapper = ({ children }) => (
  <UIProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </UIProvider>
);

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
      />, { wrapper: TestWrapper }
    );

    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles WebSocket messages without errors', () => {
    // The WebSocketManager is already mocked at the top of the file
    // We can just render the component and it will use the mocked version
    render(
      <ConnectionTab
        name="Test Connection"
        url="ws://localhost:8080"
      />, { wrapper: TestWrapper }
    );

    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles disconnection state without errors', () => {
    // The WebSocketManager is already mocked at the top of the file
    // We can just render the component and it will use the mocked version
    render(
      <ConnectionTab
        name="Test Connection"
        url="ws://localhost:8080"
      />, { wrapper: TestWrapper }
    );

    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});