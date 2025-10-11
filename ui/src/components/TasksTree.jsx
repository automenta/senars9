import React, { useState, useEffect } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item component
const SortableTaskItem = ({ task, index, onPriorityChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTaskPriorityColor = (priority) => {
    if (priority > 0.8) return '#dc3545'; // High: Red
    if (priority > 0.5) return '#ffc107'; // Medium: Yellow
    if (priority > 0.2) return '#28a745'; // Low: Green
    return '#6c757d'; // Very low: Gray
  };

  const getTaskTypeIcon = (type) => {
    if (type?.toLowerCase().includes('input')) return '📥';
    if (type?.toLowerCase().includes('derived')) return '✨';
    if (type?.toLowerCase().includes('goal')) return '🎯';
    if (type?.toLowerCase().includes('question')) return '❓';
    return '📋';
  };

  return (
    <div
      ref={setNodeRef}
      className="list-item-enter"
      style={{
        ...style,
        padding: '8px',
        margin: '4px 0',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '14px',
        border: '1px solid #ced4da',
        cursor: 'grab'
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <span style={{ marginRight: '8px', fontSize: '16px' }}>
          {getTaskTypeIcon(task.data?.type)}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold' }}>
            {task.data?.id || `Task ${index + 1}`}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {task.data?.content || 'Task content...'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontWeight: 'bold',
            color: getTaskPriorityColor(task.data?.priority || 0.5),
            minWidth: '40px',
            textAlign: 'right'
          }}
        >
          {(task.data?.priority || 0).toFixed(2)}
        </span>

        {/* Priority slider for quick reprioritization */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={task.data?.priority || 0.5}
          onChange={(e) => onPriorityChange(task, parseFloat(e.target.value))}
          style={{
            width: '60px',
            cursor: 'ew-resize'
          }}
        />

        {/* Popup button for progressive disclosure */}
        <details style={{ display: 'inline-block' }}>
          <summary style={{
            display: 'inline-block',
            padding: '2px 6px',
            backgroundColor: '#6c757d',
            color: 'white',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            ⋯
          </summary>
          <div style={{
            position: 'absolute',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            zIndex: 10,
            width: '200px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}>
            <div><strong>Task Details:</strong></div>
            <div>ID: {task.data?.id || 'N/A'}</div>
            <div>Status: {task.data?.status || 'Unknown'}</div>
            <div>Created: {task.data?.created || 'N/A'}</div>
            <div>Priority: {(task.data?.priority || 0).toFixed(2)}</div>
          </div>
        </details>
      </div>
    </div>
  );
};

const TasksTree = ({ tasks }) => {
  const [sortedTasks, setSortedTasks] = useState(tasks || []);

  useEffect(() => {
    // Sort tasks by priority in descending order (highest first)
    const sorted = [...(tasks || [])].sort((a, b) =>
      (b.data?.priority || 0) - (a.data?.priority || 0)
    );
    setSortedTasks(sorted);
  }, [tasks]);

  const handlePriorityChange = (task, newPriority) => {
    // In a real implementation, this would send the priority change to the backend
    console.log(`Changing priority of task ${task.data?.id} to ${newPriority}`);

    // Update the task locally for immediate feedback
    const updatedTasks = sortedTasks.map(t =>
      t === task ? { ...t, data: { ...t.data, priority: newPriority } } : t
    );

    // Sort again after priority change
    const sorted = [...updatedTasks].sort((a, b) =>
      (b.data?.priority || 0) - (a.data?.priority || 0)
    );

    setSortedTasks(sorted);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex(task => task.id === active.id);
      const newIndex = sortedTasks.findIndex(task => task.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = arrayMove(sortedTasks, oldIndex, newIndex);
        setSortedTasks(newTasks);
      }
    }
  };

  return (
    <div className="tasks-tree" style={{
      height: '200px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '5px 10px',
        backgroundColor: '#e9ecef',
        borderBottom: '1px solid #ccc',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        Active Tasks ({sortedTasks.length})
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div style={{
          height: 'calc(200px - 30px)', // Subtract header height
          overflowY: 'auto',
          padding: '10px'
        }}>
          <SortableContext items={sortedTasks.map(t => t.id || sortedTasks.indexOf(t))} strategy={verticalListSortingStrategy}>
            {sortedTasks && sortedTasks.length > 0 ? (
              sortedTasks.map((task, index) => (
                <SortableTaskItem
                  key={task.id || index}
                  task={task}
                  index={index}
                  onPriorityChange={handlePriorityChange}
                />
              ))
            ) : (
              <p style={{ color: '#999', fontStyle: 'italic', margin: '50px 0', textAlign: 'center' }}>
                No tasks yet...
              </p>
            )}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
};

export default TasksTree;