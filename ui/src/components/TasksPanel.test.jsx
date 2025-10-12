import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DockingLayout from './DockingLayout';

// Helper to create mock tasks with a .get() method
const createMockTask = (data) => ({
  get: (key) => data[key],
  toJSON: () => data,
});

// Mock the useCrdtWebSocket hook
vi.mock('../core/crdtWebSocket', () => ({
  default: vi.fn(() => {
    const tasks = [
      createMockTask({ id: 'task1', content: 'Process sensory input', priority: 0.8 }),
      createMockTask({ id: 'task2', content: 'Update memory patterns', priority: 0.6 })
    ];

    return {
      tasks: tasks,
    };
  })
}));

describe('TasksPanel Component - Integration Test', () => {
  it('displays tasks from the CRDT hook', () => {
    const tasks = [
      createMockTask({ id: 'task1', content: 'Process sensory input', priority: 0.8 }),
      createMockTask({ id: 'task2', content: 'Update memory patterns', priority: 0.6 })
    ];

    render(<DockingLayout tasks={tasks} />);

    // The component should display the mock task content
    const taskContent1 = screen.getByText(/Process sensory input/i);
    const taskContent2 = screen.getByText(/Update memory patterns/i);

    // Assert that the task content is visible in the document
    expect(taskContent1).toBeInTheDocument();
    expect(taskContent2).toBeInTheDocument();
  });
});
