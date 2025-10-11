import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import GraphicsEngine from './components/GraphicsEngine';

// This is now a true integration test that relies on the globally managed server.
// The `vitest.global.setup.js` script will have already started the server.

describe('App Component - Integration Test', () => {
  it('renders and connects to the integrated server', async () => {
    render(
      <GraphicsEngine>
        <App />
      </GraphicsEngine>
    );

    // Check that the main app container is in the document
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toBeInTheDocument();

    // Asynchronously wait for the "Connected" status to appear.
    // This will only happen if the WebSocket connection is successful.
    // The `findByText` query will wait for up to the test timeout (10s).
    const connectedStatus = await screen.findByText(/Status: Connected/i);

    // Assert that the connected status is visible
    expect(connectedStatus).toBeInTheDocument();
  });
});
