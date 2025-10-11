import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConnectionTab from './ConnectionTab';
import GraphicsEngine from './GraphicsEngine';

// This integration test verifies that the ConnectionTab component
// can render and establish a connection to the live server.

describe('ConnectionTab Component - Integration Test', () => {
  it('renders and connects to the WebSocket server', async () => {
    // Render the component with props for the default integrated server
    render(
      <GraphicsEngine>
        <ConnectionTab name="Test Connection" url="ws://localhost:8080" />
      </GraphicsEngine>
    );

    // The component should initially show a "Disconnected" status or similar,
    // then update asynchronously once the WebSocket connection is established.

    // We will wait for the "Connected" status to appear, which confirms
    // the useWebSocket hook successfully connected.
    const connectedStatus = await screen.findByText(/Status: Connected/i, {}, { timeout: 5000 });

    // Assert that the connected status is visible
    expect(connectedStatus).toBeInTheDocument();
  });
});
