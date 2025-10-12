import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { initialTasks } from './example-data';

// Mock the WebSocketManager to control the connection status and messages
vi.mock('./core/WebSocketManager', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    isConnected: true,
    connectionStatus: 'Connected',
    error: null,
    sendMessage: vi.fn(),
    lastMessage: null,
  })),
}));

describe('Populated UI Verification Test', () => {
  it('renders the main application container', () => {
    render(<App />);
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toBeInTheDocument();
  });

  it('displays the initial tasks from the example data', async () => {
    // We need a way to simulate the server sending the initial data.
    // For this test, we can preload the state or mock the hook's return value.
    // Let's mock the useCrdtWebSocket hook to return our initial data.
    vi.mock('./core/crdtWebSocket', () => ({
      __esModule: true,
      default: vi.fn(() => ({
        isConnected: true,
        connectionStatus: 'Connected',
        error: null,
        tasks: initialTasks,
        logs: [],
        concepts: [],
        reasonerStats: { cycles: 123 },
        sendRawMessage: vi.fn(),
        handleAddTask: vi.fn(),
        handleUpdateTask: vi.fn(),
        handleDeleteTask: vi.fn(),
      })),
    }));

    render(<App />);

    // Wait for the tasks to be rendered
    await waitFor(() => {
      // Check for the first task's content
      expect(screen.getByText(initialTasks[0].content)).toBeInTheDocument();
      // Check for the second task's content
      expect(screen.getByText(initialTasks[1].content)).toBeInTheDocument();
    });
  });

  it('displays the connection status', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
});
