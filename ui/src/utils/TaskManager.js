import { createTask, sortTasksByPriority, MESSAGE_TYPES } from './webSocketUtils';

class TaskManager {
  constructor(setData, sendMessage) {
    this.setData = setData;
    this.sendMessage = sendMessage;
  }

  handleAddTask(task) {
    const newTask = createTask(task);
    this.setData?.(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
    this.sendMessage?.(MESSAGE_TYPES.CONTROL, 'add_task', newTask);
  }

  handleUpdateTask(task) {
    this.setData?.(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t =>
        t.id === task.id ? { ...t, ...task, lastModified: Date.now() } : t)
    }));
    this.sendMessage?.(MESSAGE_TYPES.CONTROL, 'update_task', task);
  }

  handleDeleteTask(task) {
    this.setData?.(prev => ({ ...prev, tasks: (prev.tasks || []).filter(t => t.id !== task.id) }));
    this.sendMessage?.(MESSAGE_TYPES.CONTROL, 'delete_task', { id: task.id });
  }

  getSortedTasks(tasks) {
    return sortTasksByPriority(tasks || []);
  }
}

export default TaskManager;