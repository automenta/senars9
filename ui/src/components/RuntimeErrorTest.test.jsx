import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import components directly
import LogList from './LogList.jsx';
import TasksTree from './TasksTree.jsx';
import InputField from './InputField.jsx';
import ReasonerControlPanel from './ReasonerControlPanel.jsx';

// Mock console methods to detect errors
let consoleErrorSpy, consoleWarnSpy;

describe('Component Runtime Error Tests', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('LogList handles empty logs without errors', () => {
    render(<LogList logs={[]} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('TasksTree handles empty tasks without errors', () => {
    render(<TasksTree tasks={[]} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('InputField renders without errors', () => {
    render(<InputField onSend={() => {}} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('ReasonerControlPanel handles null stats without errors', () => {
    render(<ReasonerControlPanel stats={null} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('All components render without throwing errors', () => {
    const { container } = render(
      <div>
        <LogList logs={[]} />
        <TasksTree tasks={[]} />
        <InputField onSend={() => {}} />
        <ReasonerControlPanel stats={null} />
      </div>
    );
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(container).toBeInTheDocument();
  });
});