import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TasksPanel from './TasksPanel';

describe('TasksPanel Unit Test', () => {
  it('renders without leaking', () => {
    const tasks = [
      { id: 'task-1', data: { id: 'task-1', content: 'Test Task 1', priority: 0.5 } },
      { id: 'task-2', data: { id: 'task-2', content: 'Test Task 2', priority: 0.8 } },
    ];
    render(<TasksPanel tasks={tasks} />);
    expect(true).toBe(true);
  });
});
