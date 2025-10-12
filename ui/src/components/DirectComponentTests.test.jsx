import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import all the components to test them directly
import ConnectionTab from './ConnectionTab.jsx';
import LogList from './LogList.jsx';
import TasksPanel from './TasksPanel.jsx';
import InputField from './InputField.jsx';
import ReasonerControlPanel from './ReasonerControlPanel.jsx';
import ConceptMap from './ConceptMap.jsx';

// Mock console methods to detect errors
let consoleErrorSpy, consoleWarnSpy;

describe('UI Components - No Runtime Errors', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders LogList with various log types without errors', () => {
    const sampleLogs = [
      { type: 'info', data: 'System initialized', timestamp: Date.now() },
      { type: 'task', data: 'Processing task #1', timestamp: Date.now() + 1000 },
      { type: 'concept', data: 'New concept formed', timestamp: Date.now() + 2000 }
    ];
    
    const { unmount } = render(<LogList logs={sampleLogs} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders LogList with empty logs without errors', () => {
    const { unmount } = render(<LogList logs={[]} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders TasksPanel with various task types without errors', () => {
    const sampleTasks = [
      { id: 'task1', data: { id: 'task1', content: 'Input task', priority: 0.8, type: 'input' } },
      { id: 'task2', data: { id: 'task2', content: 'Goal task', priority: 0.9, type: 'goal' } },
      { id: 'task3', data: { id: 'task3', content: 'Question task', priority: 0.6, type: 'question' } }
    ];
    
    const { unmount } = render(<TasksPanel tasks={sampleTasks} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders TasksPanel with empty tasks without errors', () => {
    const { unmount } = render(<TasksPanel tasks={[]} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders InputField without errors', () => {
    const { unmount } = render(<InputField onSend={() => {}} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders ReasonerControlPanel with various stats without errors', () => {
    const stats = {
      running: true,
      concepts: 15,
      tasks: 8,
      cycles: 120
    };
    
    const { unmount } = render(<ReasonerControlPanel stats={stats} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders ReasonerControlPanel with null stats without errors', () => {
    const { unmount } = render(<ReasonerControlPanel stats={null} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders ConceptMap with various entities without errors', () => {
    const sampleEntities = [
      { type: 'concept', data: { id: 'concept1', name: 'Test Concept', priority: 0.7 } },
      { type: 'task', data: { id: 'task1', content: 'Test Task', priority: 0.8 } },
      { type: 'link', data: { source: 'concept1', target: 'task1', linkType: 'relation', strength: 0.5 } }
    ];
    
    const { unmount } = render(<ConceptMap concepts={sampleEntities} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders ConceptMap with empty concepts without errors', () => {
    const { unmount } = render(<ConceptMap concepts={[]} />);
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });

  it('renders all components together without errors', () => {
    const sampleLogs = [
      { type: 'info', data: 'System initialized', timestamp: Date.now() }
    ];
    
    const sampleTasks = [
      { id: 'task1', data: { id: 'task1', content: 'Sample task', priority: 0.7 } }
    ];
    
    const stats = {
      running: true,
      concepts: 5,
      tasks: 3,
      cycles: 50
    };
    
    const sampleEntities = [
      { type: 'concept', data: { id: 'concept1', name: 'Sample Concept', priority: 0.7 } }
    ];
    
    const { unmount } = render(
      <div>
        <LogList logs={sampleLogs} />
        <TasksTree tasks={sampleTasks} />
        <InputField onSend={() => {}} />
        <ReasonerControlPanel stats={stats} />
        <ConceptMap concepts={sampleEntities} />
      </div>
    );
    
    // Check no errors were logged
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    
    unmount();
  });
});