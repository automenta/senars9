import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock ResizeObserver for Recharts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock GraphicsEngine to prevent WebGL errors in JSDOM
vi.mock('./src/components/GraphicsEngine', () => ({
  useGraphics: () => ({
    scene: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    camera: {},
  }),
  default: ({ children }) => <div data-testid="mock-graphics-engine">{children}</div>,
}));

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock WebSocket to prevent connection attempts in tests
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  readyState: 1, // OPEN
};

// Mock WebSocket constructor
global.WebSocket = vi.fn(() => mockWebSocket);

// Mock console.error to catch errors that might be fatal in browser
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  // Reset WebSocket mock
  global.WebSocket.mockClear();
});

// Fail tests if there are console errors
globalThis.console.error = (...args) => {
  originalConsoleError(...args);
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Error')) {
    throw new Error(`Console error detected: ${args.join(' ')}`);
  }
};

// Optionally fail tests if there are warnings too
globalThis.console.warn = (...args) => {
  originalConsoleWarn(...args);
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning')) {
    // You can choose to throw an error for warnings as well, or just log them
    // For now, we'll just log but not fail the test
    // throw new Error(`Console warning detected: ${args.join(' ')}`);
  }
};

// Mock container queries for charts that need width/height
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: function() {
    return {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({})
    };
  }
});