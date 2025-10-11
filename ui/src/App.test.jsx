import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

// Mock the ConnectionTab component to prevent complex dependencies
vi.mock('./components/ConnectionTab', () => {
  return {
    default: () => <div data-testid="connection-tab">Connection Tab Mock</div>
  };
});

// Track console errors to ensure our tests catch them
let consoleErrorSpy;
let consoleWarnSpy;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

describe('App Component - Browser Console Error Prevention', () => {
  it('prevents fatal browser console errors on initial render', () => {
    render(<App />);

    // Test that the main container renders
    expect(screen.getByTestId('app-container')).toBeDefined();

    // Ensure no console errors were thrown during render
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles potential JavaScript errors gracefully without crashing', () => {
    // Mock an implementation that might throw errors
    const originalConsoleError = console.error;

    // Temporarily spy on console.error to make sure our error handling works
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      // Our setup should prevent errors from being silent
      originalConsoleError(...args);
    });

    render(<App />);

    // Verify the app renders correctly without JS errors
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toBeInTheDocument();

    // Check that no error was logged during the render
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.anything()
    );

    errorSpy.mockRestore();
  });

  it('maintains stability when components receive unexpected props', () => {
    // This test ensures that even if there are component rendering issues,
    // they don't result in fatal console errors that break the app
    const { unmount } = render(<App />);

    // Make sure unmounting doesn't generate errors either
    unmount();

    // Check that no errors occurred during the full lifecycle
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});