import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App.jsx';

// Mock the WebSocketManager to avoid connection issues
vi.mock('../core/WebSocketManager', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    messages: [],
    sendMessage: vi.fn(),
    reconnect: vi.fn(),
    disconnect: vi.fn(),
    reconnectAttempts: 0
  }))
}));

// Mock console methods to detect errors
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('App Component - No Runtime Errors', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear();
    consoleWarnSpy.mockClear();
  });

  it('renders without fatal console errors', async () => {
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
    
    await waitFor(() => {
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });
    
    // Verify no console errors occurred
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    // Check for the default title
    expect(screen.getByText('SeNARS UI')).toBeInTheDocument();
  });
});