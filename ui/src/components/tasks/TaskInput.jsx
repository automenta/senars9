import React, { useState } from 'react';
import './TaskInput.css';

const TaskInput = ({ onAddTask }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddTask({ text: inputValue, priority: 0.5 }); // Default priority
      setInputValue('');
    }
  };

  return (
    <form className="task-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="task-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter a new task..."
      />
      <button type="submit" className="task-submit-button">Add Task</button>
    </form>
  );
};

export default TaskInput;
