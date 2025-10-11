// src/test-utils.jsx
import { render } from '@testing-library/react';
import { vi } from 'vitest';

// Custom render function with common mocks applied
export const renderWithMocks = (ui, options = {}) => {
  // Mock WebSocketManager
  vi.mock('./core/WebSocketManager', () => {
    return {
      useWebSocket: vi.fn(() => ({
        isConnected: false,
        messages: [],
        sendMessage: vi.fn(),
      }))
    };
  });

  return render(ui, options);
};