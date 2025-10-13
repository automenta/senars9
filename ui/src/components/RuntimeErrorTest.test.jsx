import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import components directly
import LogList from './LogList.jsx';
import TasksPanel from './TasksPanel.jsx';
import InputField from './InputField.jsx';
import ReasonerControlPanel from './ReasonerControlPanel.jsx';
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

// Mock console methods to detect errors
let consoleErrorSpy, consoleWarnSpy;

describe('Component Runtime Error Tests', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('LogList handles empty logs without errors', () => {
    render(<LogList logs={[]} />, { wrapper: TestWrapper });
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('TasksPanel handles empty tasks without errors', () => {
    render(<TasksPanel tasks={[]} />, { wrapper: TestWrapper });
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('InputField renders without errors', () => {
    render(<InputField onSend={() => {}} />, { wrapper: TestWrapper });
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('ReasonerControlPanel handles null stats without errors', () => {
    render(<ReasonerControlPanel stats={null} />, { wrapper: TestWrapper });
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('All components render without throwing errors', () => {
    const { container } = render(
      <div>
        <LogList logs={[]} />
        <TasksPanel tasks={[]} />
        <InputField onSend={() => {}} />
        <ReasonerControlPanel stats={null} />
      </div>, { wrapper: TestWrapper }
    );
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(container).toBeInTheDocument();
  });
});