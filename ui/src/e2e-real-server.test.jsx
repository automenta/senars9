import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom';

// This test suite is designed to run against a live, running instance of the backend server.
// Ensure the server is started before running these tests.

describe('End-to-end test with a real server connection', () => {
  it('should wait for connection, add a task, and see it in the tasks panel', async () => {
    render(<App />);

    // Wait for the WebSocket connection to be established by looking for the "Connected" status indicator.
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    }, { timeout: 5000 }); // Generous timeout for connection

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

    // After clicking, the new task should be sent to the server, processed,
    // and broadcast back to the client. We need to wait for the UI to update.
    await waitFor(() => {
      expect(screen.getByText(newTaskContent)).toBeInTheDocument();
    }, { timeout: 5000 }); // Generous timeout for the network roundtrip
  }, 10000); // Set a 10-second timeout for the entire test
});
