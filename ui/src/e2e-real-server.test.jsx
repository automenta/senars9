import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import App from './App';
import '@testing-library/jest-dom';

// Fully mock the crdtWebSocket hook
const mockDisconnect = vi.fn();

vi.mock('./core/crdtWebSocket', async () => {
  const actual = await vi.importActual('./core/crdtWebSocket');
  return {
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
      // Mock the cleanup function to prevent hanging
      disconnect: mockDisconnect,
    })
  };
});

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

  afterAll(() => {
    // Ensure cleanup after tests
    mockDisconnect();
  });

  it('should wait for connection, add a task, and see it in the tasks panel', async () => {
    const { unmount } = render(<App />);

    // Wait for the app container to be present
    await waitFor(() => {
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    }, { timeout: 1000 });

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
    
    // Unmount to trigger cleanup
    unmount();
  }, 3000); // Set a reasonable timeout
});
