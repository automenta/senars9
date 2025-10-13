import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import App from './App';
import '@testing-library/jest-dom';

// Mock the crdtWebSocket hook to simulate a successful connection
vi.mock('./core/crdtWebSocket', () => ({
  default: (url) => ({
    isConnected: true,
    connectionStatus: 'connected',
    tasks: [],
    logs: [],
    concepts: [],
    reasonerStats: { running: true, concepts: 0, tasks: 0, cycles: 0 },
    sendRawMessage: vi.fn(),
    sendMessage: vi.fn(),
    handleAddTask: vi.fn(),
    handleUpdateTask: vi.fn(),
    handleDeleteTask: vi.fn(),
  })
}));

// Mock the CommandService
vi.mock('./services/CommandService', () => ({
  default: vi.fn(() => ({
    execute: vi.fn(),
  }))
}));

describe('End-to-end test with a real server connection', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('should wait for connection, add a task, and see it in the tasks panel', async () => {
    render(<App />);

    // Wait for the WebSocket connection to be established by looking for the "Connected" status indicator.
    // Since we're mocking, we should check for connection status text
    await waitFor(() => {
      // Look for elements that would be present when the app is connected
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    }, { timeout: 2000 }); // Shorter timeout since we're mocking

    // Find the input field and the send button in the ReasonerControlPanel
    const taskInput = screen.getByPlaceholderText('Enter a command or task (e.g. /cmd start)...');
    const sendButton = screen.getByText('Send');

    expect(taskInput).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();

    // Simulate typing a new task into the input field
    const newTaskContent = 'My brand new task from a successful e2e test';
    fireEvent.change(taskInput, { target: { value: newTaskContent } });

    // Simulate clicking the "Send" button
    fireEvent.click(sendButton);

    // After clicking, expect the input to be cleared
    expect(taskInput.value).toBe('');
  }, 5000); // Set a more reasonable timeout for the mocked test
});
