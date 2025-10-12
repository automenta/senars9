import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';
import { renderWithErrorDetection, createWebSocketMock } from './test-utils';

describe('App Component - Runtime Error Tests', () => {
  let spies;

  beforeEach(() => {
    spies = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    spies.mockRestore();
  });

  it('renders without fatal console errors', () => {
    const { container, expectNoErrors } = renderWithErrorDetection(<App />);

    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('app-container')).toBeInTheDocument();
    expectNoErrors();
  });

  it('renders connection tabs without runtime errors', () => {
    const { expectNoErrors } = renderWithErrorDetection(<App />);

    expect(screen.getByTestId('app-container')).toBeInTheDocument();
    expectNoErrors();
  });

  it('handles WebSocket connection errors gracefully', () => {
    const originalWebSocket = global.WebSocket;
    global.WebSocket = vi.fn(() => createWebSocketMock({ readyState: 0 }));

    const { expectNoErrors } = renderWithErrorDetection(<App />);

    expect(screen.getByTestId('app-container')).toBeInTheDocument();
    expectNoErrors();

    global.WebSocket = originalWebSocket;
  });

  it('handles component prop updates without errors', () => {
    const { rerender, expectNoErrors } = renderWithErrorDetection(<App />);

    // Rerender multiple times to ensure stability
    for (let i = 0; i < 5; i++) {
      rerender(<App />);
    }

    expect(screen.getByTestId('app-container')).toBeInTheDocument();
    expectNoErrors();
  });
});

import ReasonerControlPanel from './components/ReasonerControlPanel';
import LogList from './components/LogList';
import TasksPanel from './components/TasksPanel';
import InputField from './components/InputField';
import { createMockStats, createMockLogs, createMockTasks } from './test-utils';

// Test individual components
describe('Individual Component Runtime Error Tests', () => {
  let spies;

  beforeEach(() => {
    spies = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    spies.mockRestore();
  });

  it('ReasonerControlPanel handles null stats gracefully', () => {
    const { expectNoErrors } = renderWithErrorDetection(
      <ReasonerControlPanel stats={null} />
    );

    expectNoErrors();
  });

  it('LogList handles empty logs gracefully', () => {
    const { expectNoErrors } = renderWithErrorDetection(
      <LogList logs={[]} />
    );

    expectNoErrors();
  });

  it('TasksPanel handles empty tasks gracefully', () => {
    const { expectNoErrors } = renderWithErrorDetection(
      <TasksPanel tasks={[]} />
    );

    expectNoErrors();
  });

  it('InputField renders without errors', () => {
    const { expectNoErrors } = renderWithErrorDetection(
      <InputField onSend={() => {}} />
    );

    expectNoErrors();
  });
});