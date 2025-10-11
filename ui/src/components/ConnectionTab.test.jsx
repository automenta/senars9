import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConnectionTab from './ConnectionTab';
import GraphicsEngine from './GraphicsEngine';
import { renderWithErrorDetection } from '../test-utils';

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
  it('renders and shows connected status', () => {
    const { expectNoErrors } = renderWithErrorDetection(
      <GraphicsEngine>
        <ConnectionTab name="Test Connection" url="ws://localhost:8080" />
      </GraphicsEngine>
    );

    expect(screen.getByText(/Status: Connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Connection/)).toBeInTheDocument();
    expect(screen.getByText(/ws:\/\/localhost:8080/)).toBeInTheDocument();
    expectNoErrors();
  });
});
