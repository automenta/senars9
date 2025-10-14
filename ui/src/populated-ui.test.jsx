import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import App from './App';
import { UIProvider } from './core/UIContext';
import { NotificationProvider } from './core/NotificationSystem';
import WebSocket from 'ws';
import startServer from '../server.js';

let serverProcess;

// Wrapper component that includes all necessary providers
const TestWrapper = ({ children }) => (
  <UIProvider>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </UIProvider>
);

describe('Populated UI Verification Test', () => {
  beforeAll(async () => {
    serverProcess = await startServer();
  });

  afterAll(() => {
    serverProcess.kill();
  });

  it('renders the main application container', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    const appContainer = screen.getByTestId('app-container');
    expect(appContainer).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    expect(() => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );
    }).not.toThrow();
  });

  it('should establish a WebSocket connection with the server', async () => {
    const ws = new WebSocket('ws://localhost:8080/?protocol=simple');
    const openPromise = new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', (err) => reject(new Error(`WebSocket error: ${err.message}`)));
    });
    await openPromise;
    expect(ws.readyState).toBe(WebSocket.OPEN);

    const closePromise = new Promise((resolve, reject) => {
      ws.on('close', resolve);
      ws.on('error', (err) => reject(new Error(`WebSocket error on close: ${err.message}`)));
    });
    ws.close();
    await closePromise;
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });
});
