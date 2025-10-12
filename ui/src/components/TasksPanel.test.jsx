import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TasksPanel from './TasksPanel';
import * as Y from 'yjs';

// Mock the useCrdtWebSocket hook
vi.mock('../core/crdtWebSocket', () => ({
  default: vi.fn(() => {
    const ydoc = new Y.Doc();
    const yTasks = ydoc.getArray('tasks');
    const tasks = [
      { id: 'task1', content: 'Process sensory input', priority: 0.8 },
      { id: 'task2', content: 'Update memory patterns', priority: 0.6 }
    ];
    tasks.forEach(task => yTasks.push([new Y.Map(Object.entries(task))]));

    return {
      tasks: yTasks.toArray(),
    };
  })
}));

describe('TasksPanel Component - Integration Test', () => {
  it('displays tasks from the CRDT hook', () => {
    render(<TasksPanel />);

    // The component should display the mock task content
    const taskContent1 = screen.getByText(/Process sensory input/i);
    const taskContent2 = screen.getByText(/Update memory patterns/i);

    // Assert that the task content is visible in the document
    expect(taskContent1).toBeInTheDocument();
    expect(taskContent2).toBeInTheDocument();
  });
});
