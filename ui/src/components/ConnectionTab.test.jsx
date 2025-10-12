import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConnectionTab from './ConnectionTab';
import { renderWithErrorDetection } from '../test-utils';

// Mock the useCrdtWebSocket hook to simulate a successful connection
vi.mock('../core/crdtWebSocket', () => ({
  default: vi.fn(() => ({
    isConnected: true,
    connectionStatus: 'connected',
  }))
}));

describe('ConnectionTab Component - Integration Test', () => {
  it('renders and shows connected status', () => {
    const { expectNoErrors } = renderWithErrorDetection(
      <ConnectionTab name="Test Connection" url="ws://localhost:8080" />
    );

    expect(screen.getByText(/Status: connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Connection/)).toBeInTheDocument();
    expect(screen.getByText(/ws:\/\/localhost:8080/)).toBeInTheDocument();
    expectNoErrors();
  });
});
