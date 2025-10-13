import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TasksPanel from './TasksPanel';
import { mockWebSocketProvider } from '../test-utils';

// Create a new mock for each test to avoid state sharing
let mockAddTask, mockUpdateTask, mockDeleteTask;

beforeEach(() => {
  mockAddTask = vi.fn();
  mockUpdateTask = vi.fn();
  mockDeleteTask = vi.fn();
});

describe('TasksPanel Component', () => {
  const mockTasks = [
    {
      id: '1',
      content: 'Test task 1',
      priority: 0.8,
      type: 'Input',
      status: 'Input',
      createdAt: Date.now(),
    },
    {
      id: '2',
      content: 'Test task 2',
      priority: 0.5,
      type: 'Goal',
      status: 'Input',
      createdAt: Date.now(),
    }
  ];

  it('renders tasks correctly', () => {
    render(
      <TasksPanel
        tasks={mockTasks}
        onAddTask={mockAddTask}
        onUpdateTask={mockUpdateTask}
        onDeleteTask={mockDeleteTask}
      />
    );

    expect(screen.getByText('Test task 1')).toBeInTheDocument();
    expect(screen.getByText('Test task 2')).toBeInTheDocument();
    expect(screen.getByText('Active Tasks (2)')).toBeInTheDocument();
  });

  it('allows adding new tasks', async () => {
    render(
      <TasksPanel
        tasks={[]}
        onAddTask={mockAddTask}
        onUpdateTask={mockUpdateTask}
        onDeleteTask={mockDeleteTask}
      />
    );

    // Click the "Add Task" button
    fireEvent.click(screen.getByText('+ Add Task'));
    
    // Fill in the form
    const input = screen.getByPlaceholderText('Task content...');
    fireEvent.change(input, { target: { value: 'New test task' } });
    
    // Change priority
    const prioritySlider = screen.getByRole('slider');
    fireEvent.change(prioritySlider, { target: { value: 0.7 } });
    
    // Select task type
    const typeSelect = screen.getByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'Goal' } });
    
    // Click add button
    fireEvent.click(screen.getByText('Add Task'));
    
    // Wait for the call to happen
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith({
        content: 'New test task',
        priority: 0.7,
        type: 'Goal',
        status: 'Input',
        dependencies: [],
        metadata: { createdAt: expect.any(Number) }
      });
    });
  });

  it('allows deleting tasks', () => {
    render(
      <TasksPanel
        tasks={mockTasks}
        onAddTask={mockAddTask}
        onUpdateTask={mockUpdateTask}
        onDeleteTask={mockDeleteTask}
      />
    );

    // Find and click the delete button in the expanded view
    const taskElement = screen.getByText('Test task 1');
    fireEvent.click(taskElement); // Expand the task
    
    // The delete button should appear
    const deleteButton = screen.getByText('🗑️ Delete');
    fireEvent.click(deleteButton);
    
    expect(mockDeleteTask).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('allows updating task priority', async () => {
    render(
      <TasksPanel
        tasks={mockTasks}
        onAddTask={mockAddTask}
        onUpdateTask={mockUpdateTask}
        onDeleteTask={mockDeleteTask}
      />
    );

    // Find the priority slider for the first task
    const prioritySlider = screen.getAllByRole('slider')[0];
    fireEvent.change(prioritySlider, { target: { value: 0.9 } });
    
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith({
        ...mockTasks[0],
        priority: 0.9,
        lastModified: expect.any(Number)
      });
    });
  });

  it('shows empty state when no tasks', () => {
    render(
      <TasksPanel
        tasks={[]}
        onAddTask={mockAddTask}
        onUpdateTask={mockUpdateTask}
        onDeleteTask={mockDeleteTask}
      />
    );

    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });
});