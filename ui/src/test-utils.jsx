import { render } from '@testing-library/react';
import { vi } from 'vitest';

// Shared test utilities following AGENTS.md guidelines:
// - Consolidated, DRY, modularized, parameterized
// - Terse syntax, self-documenting code

// Console spy utilities - reusable across all tests
export const createConsoleSpies = () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  return { errorSpy, warnSpy };
};

export const restoreConsoleSpies = (spies) => {
  spies.errorSpy?.mockRestore();
  spies.warnSpy?.mockRestore();
};

// Component render utilities with error detection
export const renderWithErrorDetection = (component, options = {}) => {
  const spies = createConsoleSpies();
  const result = render(component, options);

  return {
    ...result,
    spies,
    expectNoErrors: () => {
      expect(spies.errorSpy).not.toHaveBeenCalled();
      expect(spies.warnSpy).not.toHaveBeenCalled();
    }
  };
};

// Common mock factories
export const createWebSocketMock = (overrides = {}) => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  readyState: 1, // OPEN
  ...overrides
});

export const createComponentMocks = () => ({
  WebSocket: vi.fn(() => createWebSocketMock()),
  ResizeObserver: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
});

// Test data factories
export const createMockStats = (overrides = {}) => ({
  cycles: 0,
  concepts: 0,
  tasks: 0,
  ...overrides
});

export const createMockLogs = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    message: `Test log message ${i}`,
    timestamp: Date.now(),
    level: 'info'
  }));

export const createMockTasks = (count = 2) =>
  Array.from({ length: count }, (_, i) => ({
    id: `task-${i}`,
    name: `Test Task ${i}`,
    status: 'pending',
    priority: i
  }));