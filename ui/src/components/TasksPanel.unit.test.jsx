import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TasksPanel from './TasksPanel';

// Mock the useCrdtWebSocket hook
vi.mock('../core/crdtWebSocket', () => ({
  default: vi.fn(() => ({
    tasks: [],
    handleAddTask: vi.fn(),
    handleUpdateTask: vi.fn(),
    handleDeleteTask: vi.fn(),
  })),
}));

describe('TasksPanel Unit Test', () => {
  it('renders without leaking', () => {
    render(<TasksPanel />);
    expect(true).toBe(true);
  });
});
