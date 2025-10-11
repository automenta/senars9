import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConnectionTab from './ConnectionTab';
import GraphicsEngine from './GraphicsEngine';

// This integration test verifies that the TasksTree component, within a ConnectionTab,
// correctly receives and displays task messages from the live server.

describe('TasksTree Component - Integration Test', () => {
  it('receives and displays tasks from the WebSocket server', async () => {
    // Render the parent component that manages the WebSocket connection
    render(
      <GraphicsEngine>
        <ConnectionTab name="Test Connection" url="ws://localhost:8080" />
      </GraphicsEngine>
    );

    // The server sends mock tasks with content like "Process sensory input".
    // We will wait for an element that contains this text.
    const taskContent = await screen.findByText(/Process sensory input/i, {}, { timeout: 5000 });

    // Assert that the task content is visible in the document
    expect(taskContent).toBeInTheDocument();
  });
});
