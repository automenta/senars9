import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConnectionTab from './ConnectionTab';
import GraphicsEngine from './GraphicsEngine';

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

describe('ConnectionTab Component - Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and shows connected status', async () => {
    // Render the component with props for the default integrated server
    render(
      <GraphicsEngine>
        <ConnectionTab name="Test Connection" url="ws://localhost:8080" />
      </GraphicsEngine>
    );

    // The component should show "Connected" status since we mocked it
    const connectedStatus = screen.getByText(/Status: Connected/i);

    // Assert that the connected status is visible
    expect(connectedStatus).toBeInTheDocument();

    // Also verify the connection name and URL are displayed
    expect(screen.getByText(/Test Connection/)).toBeInTheDocument();
    expect(screen.getByText(/ws:\/\/localhost:8080/)).toBeInTheDocument();
  });
});
