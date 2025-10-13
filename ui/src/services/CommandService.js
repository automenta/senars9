import { useCallback } from 'react';

class CommandService {
  constructor(sendRawMessage) {
    this.sendRawMessage = sendRawMessage;
  }

  execute(command, payload = {}) {
    // Standardized command format
    const message = {
      type: 'control',
      command,
      payload
    };
    
    if (this.sendRawMessage) {
      this.sendRawMessage(message);
      return Promise.resolve(true);
    } else {
      return Promise.reject(new Error('sendRawMessage function not provided'));
    }
  }

  // Convenience methods for common commands
  start() {
    return this.execute('start');
  }

  stop() {
    return this.execute('stop');
  }

  step() {
    return this.execute('step');
  }

  reset() {
    return this.execute('reset');
  }

  throttle(value) {
    return this.execute('throttle', { value });
  }

  addTask(content, priority = 0.5, type = 'Input', status = 'Input') {
    return this.execute('add_task', { 
      content, 
      priority, 
      type, 
      status
    });
  }
  
  updateTask(taskId, updates) {
    return this.execute('update_task', { id: taskId, ...updates });
  }
  
  deleteTask(taskId) {
    return this.execute('delete_task', { id: taskId });
  }
}

// React hook to create command service instance
export const useCommandService = (sendRawMessage) => {
  return useCallback(() => new CommandService(sendRawMessage), [sendRawMessage]);
};

export default CommandService;