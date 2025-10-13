import React, { useState } from 'react';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPriorityColor, getItemIcon } from '../utils/common';

const SortableTaskItem = ({ task, index, onPriorityChange, onDeleteTask }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id || index });
  const [isExpanded, setIsExpanded] = useState(false);

  const baseStyle = {
    padding: '6px 8px',
    margin: '2px 0',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    cursor: 'grab',
    transition: 'all 0.2s ease',
    minHeight: '36px'
  };

  const expandedStyle = {
    backgroundColor: '#e7f1ff',
    border: '1px solid #0d6efd'
  };

  const collapsedStyle = {
    backgroundColor: '#f8f9fa',
    border: '1px solid #ced4da'
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...baseStyle,
        ...(isExpanded ? expandedStyle : collapsedStyle),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
      }}
      {...attributes}
      {...listeners}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: `${getPriorityColor(task.priority || 0.5)}20`,
        marginRight: '8px',
        fontSize: '12px',
        color: getPriorityColor(task.priority || 0.5)
      }}>
        {getItemIcon(task.type)}
      </span>

      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: '500', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.content || task.id || `Task ${index + 1}`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px', justifyContent: 'flex-end' }}>
        <span style={{
          fontWeight: 'bold',
          color: getPriorityColor(task.priority || 0.5),
          fontSize: '11px',
          minWidth: '30px',
          textAlign: 'right'
        }}>
          {(task.priority || 0).toFixed(2)}
        </span>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={task.priority || 0.5}
          onChange={e => onPriorityChange(task, parseFloat(e.target.value))}
          style={{ width: '40px', cursor: 'ew-resize', height: '16px' }}
          title="Drag to reprioritize"
        />

        <button
          onClick={e => (e.stopPropagation(), setIsExpanded(!isExpanded))}
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
              style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#6c757d' }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><strong>ID:</strong> {task.id || 'N/A'}</div>
            <div><strong>Type:</strong> {task.type || 'N/A'}</div>
            <div><strong>Status:</strong> {task.status || 'N/A'}</div>
            <div><strong>Priority:</strong> {(task.priority || 0).toFixed(3)}</div>
            <div><strong>Created:</strong> {task.created || 'N/A'}</div>
            <div><strong>Content:</strong> {task.content || 'N/A'}</div>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button
              style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', backgroundColor: '#e9ecef' }}
              onClick={() => console.log('Execute task:', task.id)}
            >
              ▶️ Execute
            </button>
            <button
              style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', backgroundColor: '#e9ecef' }}
              onClick={() => onDeleteTask(task)}
            >
              🗑️ Delete
            </button>
            <button
              style={{ padding: '4px 8px', fontSize: '10px', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer', backgroundColor: '#e9ecef' }}
              onClick={() => onPriorityChange(task, Math.min(1, (task.priority || 0) + 0.1))}
            >
              ⬆️ Up Priority
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TasksPanel = ({ tasks = [], memoryTasks = [], onUpdateTask, onDeleteTask }) => {
  // Use memoryTasks (derivations from Memory) if available, otherwise fall back to regular tasks
  const [displayTasks, setDisplayTasks] = useState(memoryTasks.length > 0 ? memoryTasks : tasks || []);

  React.useEffect(() => {
    // Prioritize memoryTasks (derivations) over regular tasks
    setDisplayTasks(memoryTasks.length > 0 ? memoryTasks : tasks || []);
  }, [memoryTasks, tasks]);

  const handlePriorityChange = (task, newPriority) => {
    onUpdateTask?.({ ...task, priority: newPriority, lastModified: Date.now() });
  };

  const handleDeleteTask = (task) => {
    onDeleteTask?.(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id === over.id) return;

    const oldIndex = displayTasks.findIndex(task => task.id === active.id);
    const newIndex = displayTasks.findIndex(task => task.id === over.id);

    (oldIndex !== -1 && newIndex !== -1) &&
      setDisplayTasks(arrayMove(displayTasks, oldIndex, newIndex));
  };

  return (
    <div className="tasks-tree" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '5px 10px',
        backgroundColor: '#e9ecef',
        borderBottom: '1px solid #ccc',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {memoryTasks.length > 0 ? 'Derivations' : 'Active Tasks'} ({displayTasks.length})
        </div>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', position: 'relative' }}>
          <SortableContext items={displayTasks.map(t => t.id || displayTasks.indexOf(t))} strategy={verticalListSortingStrategy}>
            {displayTasks.length > 0 ? (
              displayTasks.map((task, index) => (
                <div key={`${task.id || index}-container`} style={{ position: 'relative' }}>
                  <SortableTaskItem
                    task={task}
                    index={index}
                    onPriorityChange={handlePriorityChange}
                    onDeleteTask={handleDeleteTask}
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
                <div>{memoryTasks.length > 0 ? 'No derivations available' : 'No active tasks'}</div>
                <div style={{ fontSize: '10px', marginTop: '5px' }}>
                  {memoryTasks.length > 0
                    ? 'Derivations will appear here as they are generated by the reasoning system'
                    : 'Tasks will appear here as they are created'
                  }
                </div>
              </div>
            )}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
};

export default TasksPanel;
