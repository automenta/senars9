import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConnectionTab from './ConnectionTab';
import { UIProvider } from '../core/UIContext';
import { NotificationProvider } from '../core/NotificationSystem';

// Wrapper component that includes all necessary providers
const TestWrapper = ({ children }) => (
  <UIProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </UIProvider>
);

// Fully mock the useCrdtWebSocket hook to avoid WebSocket connections
vi.mock('../core/crdtWebSocket', () => ({
  default: vi.fn(() => ({
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
  }))
}));

// Mock the CommandService
vi.mock('../services/CommandService', () => ({
  default: vi.fn(() => ({
    execute: vi.fn(),
  }))
}));

describe('ConnectionTab Component - Integration Test', () => {
  it('renders and shows connected status', () => {
    const { unmount } = render(
      <ConnectionTab name="Test Connection" url="ws://localhost:8080" />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/Status: Connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Connection/)).toBeInTheDocument();
    expect(screen.getByText(/ws:\/\/localhost:8080/)).toBeInTheDocument();
    
    // Clean up
    unmount();
  });
});