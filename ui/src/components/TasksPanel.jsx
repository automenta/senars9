import React from 'react';
import TaskList from './tasks/TaskList';

const TasksPanel = ({ tasks, onUpdateTask, onDeleteTask }) => {
  return (
    <div style={{ padding: '1rem', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      <h2>Tasks</h2>
      <TaskList
        tasks={tasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
};

export default TasksPanel;
