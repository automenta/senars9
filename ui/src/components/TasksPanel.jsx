import React, { useState, useEffect } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item component
const SortableTaskItem = ({ task, index, onPriorityChange, onDeleteTask }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id || index });

  const [isExpanded, setIsExpanded] = useState(false);

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
    if (type?.toLowerCase().includes('operation')) return '⚙️';
    if (type?.toLowerCase().includes('inference')) return '💭';
    return '📋';
  };

  const handleTaskClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={setNodeRef}
      className="task-item"
      style={{
        ...style,
        padding: '6px 8px',
        margin: '2px 0',
        backgroundColor: isExpanded ? '#e7f1ff' : '#f8f9fa',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        border: `1px solid ${isExpanded ? '#0d6efd' : '#ced4da'}`,
        cursor: 'grab',
        transition: 'all 0.2s ease',
        minHeight: '36px'
      }}
      {...attributes}
      {...listeners}
      onClick={handleTaskClick}
    >
      {/* Task type icon */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: `${getTaskPriorityColor(task.data?.priority || 0.5)}20`, // Lighter background
        marginRight: '8px',
        fontSize: '12px',
        color: getTaskPriorityColor(task.data?.priority || 0.5)
      }}>
        {getTaskTypeIcon(task.data?.type)}
      </span>

      {/* Task content - one line as specified */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          fontWeight: '500',
          color: '#333',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {task.data?.content || task.data?.id || `Task ${index + 1}`}
        </div>
      </div>

      {/* Priority display and controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: '120px',
        justifyContent: 'flex-end'
      }}>
        <span
          style={{
            fontWeight: 'bold',
            color: getTaskPriorityColor(task.data?.priority || 0.5),
            fontSize: '11px',
            minWidth: '30px',
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
            width: '40px',
            cursor: 'ew-resize',
            height: '16px'
          }}
          title="Drag to reprioritize"
        />

        {/* Popup button for progressive disclosure */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            padding: '2px 6px',
            backgroundColor: isExpanded ? '#0d6efd' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ⋯
        </button>
      </div>

      {/* Expanded details view */}
      {isExpanded && (
        <div style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '100%',
          backgroundColor: 'white',
          border: '1px solid #0d6efd',
          borderRadius: '4px',
          padding: '10px',
          zIndex: 20,
          marginTop: '2px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, color: '#0d6efd' }}>Task Details</h4>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><strong>ID:</strong> {task.data?.id || 'N/A'}</div>
            <div><strong>Type:</strong> {task.data?.type || 'N/A'}</div>
            <div><strong>Status:</strong> {task.data?.status || 'N/A'}</div>
            <div><strong>Priority:</strong> {(task.data?.priority || 0).toFixed(3)}</div>
            <div><strong>Created:</strong> {task.data?.created || 'N/A'}</div>
            <div><strong>Content:</strong> {task.data?.content || 'N/A'}</div>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#e9ecef'
              }}
              onClick={() => console.log('Execute task:', task.data?.id)}
            >
              ▶️ Execute
            </button>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#e9ecef'
              }}
              onClick={() => onDeleteTask(task)}
            >
              🗑️ Delete
            </button>
            <button
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: '#e9ecef'
              }}
              onClick={() => onPriorityChange(task, Math.min(1, (task.data?.priority || 0) + 0.1))}
            >
              ⬆️ Up Priority
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TasksPanel = ({ tasks = [], onUpdateTask, onDeleteTask }) => {
  const [sortedTasks, setSortedTasks] = useState(tasks || []);
  const [expandedTask, setExpandedTask] = useState(null);

  useEffect(() => {
    // Sort tasks by priority in descending order (highest first)
    const sorted = [...(tasks || [])].sort((a, b) =>
      (b.data?.priority || 0) - (a.data?.priority || 0)
    );
    setSortedTasks(sorted);
  }, [tasks]);

  const handlePriorityChange = (task, newPriority) => {
    if (onUpdateTask) {
      const updatedTask = {
        ...task,
        data: {
          ...task.data,
          priority: newPriority,
        },
      };
      onUpdateTask(updatedTask);
    }
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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
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
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          position: 'relative'
        }}>
          <SortableContext items={sortedTasks.map(t => t.id || sortedTasks.indexOf(t))} strategy={verticalListSortingStrategy}>
            {sortedTasks && sortedTasks.length > 0 ? (
              sortedTasks.map((task, index) => (
                <div key={`${task.id || index}-container`} style={{ position: 'relative' }}>
                  <SortableTaskItem
                    task={task}
                    index={index}
                    onPriorityChange={handlePriorityChange}
                    onDeleteTask={onDeleteTask}
                  />
                </div>
              ))
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
                <div>No active tasks</div>
                <div style={{ fontSize: '10px', marginTop: '5px' }}>Tasks will appear here as they are created</div>
              </div>
            )}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
};

export default TasksPanel;
