import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConnectionTab from './ConnectionTab';
import GraphicsEngine from './GraphicsEngine';

// Mock WebSocketManager to simulate receiving task messages
vi.mock('../core/WebSocketManager', () => ({
  default: vi.fn(() => ({
    isConnected: true,
    messages: [
      { type: 'task', data: { id: 'task1', content: 'Process sensory input', priority: 0.8 } },
      { type: 'task', data: { id: 'task2', content: 'Update memory patterns', priority: 0.6 } }
    ],
    sendMessage: vi.fn(),
    reconnect: vi.fn(),
    disconnect: vi.fn(),
    reconnectAttempts: 0
  }))
}));

describe('TasksTree Component - Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays tasks received from WebSocket messages', () => {
    // Render the parent component that manages the WebSocket connection
    render(
      <GraphicsEngine>
        <ConnectionTab name="Test Connection" url="ws://localhost:8080" />
      </GraphicsEngine>
    );

    // The component should display the mock task content
    const taskContent1 = screen.getByText(/Process sensory input/i);
    const taskContent2 = screen.getByText(/Update memory patterns/i);

    // Assert that the task content is visible in the document
    expect(taskContent1).toBeInTheDocument();
    expect(taskContent2).toBeInTheDocument();
  });
});
