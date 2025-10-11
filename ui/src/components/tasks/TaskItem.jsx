import React, { useState } from 'react';
import './TaskItem.css';

const TaskItem = ({ task, onUpdateTask, onDeleteTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = () => {
    onDeleteTask({ id: task.id });
  };

  const handlePriorityChange = (e) => {
    const newPriority = parseFloat(e.target.value);
    onUpdateTask({ id: task.id, priority: newPriority });
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="task-item">
      <div className="task-main" onClick={toggleExpand}>
        <span className="task-text">{task.text}</span>
        <div className="task-controls">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={task.priority}
            onChange={handlePriorityChange}
            className="priority-slider"
          />
          <span className="priority-value">{task.priority.toFixed(1)}</span>
          <button onClick={handleDelete} className="delete-button">Delete</button>
        </div>
      </div>
      {isExpanded && (
        <div className="task-details">
          <strong>ID:</strong> {task.id}
          {/* Add other task details here as they become available */}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
