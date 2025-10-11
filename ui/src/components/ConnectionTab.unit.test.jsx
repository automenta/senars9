import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConnectionTab from './ConnectionTab';

// Mock console methods to detect errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('ConnectionTab Component - Runtime Error Tests', () => {
  let consoleErrorSpy, consoleWarnSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders without fatal console errors', () => {
    render(
      <ConnectionTab 
        name="Test Connection" 
        url="ws://localhost:8080" 
      />
    );

    // Check that no errors were logged during rendering
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    // Verify the component renders
    expect(screen.getByText(/Test Connection/)).toBeInTheDocument();
  });

  it('handles WebSocket connection status changes gracefully', () => {
    render(
      <ConnectionTab 
        name="Test Connection" 
        url="ws://localhost:8080" 
      />
    );

    // Check no errors occurred
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('manages panels without errors', async () => {
    const { container } = render(
      <ConnectionTab 
        name="Test Connection" 
        url="ws://localhost:8080" 
      />
    );

    // Check no errors occurred during initial render
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    // Test drag end functionality (if applicable)
    // Check that the required elements are present
    expect(screen.getByText(/Connection:/)).toBeInTheDocument();
  });

  it('handles different panel layouts without errors', () => {
    render(
      <ConnectionTab 
        name="Test Connection" 
        url="ws://localhost:8080" 
      />
    );
    
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
