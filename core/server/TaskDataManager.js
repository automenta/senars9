import { WebSocketUtils } from './WebSocketUtils.js';
import { randomUUID } from 'crypto';

class TaskDataManager {
  constructor(memory) {
    this.memory = memory;
  }

  loadInitialTasksToMemory() {
    try {
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          WebSocketUtils.warn('Task missing content, skipping:', taskData);
          continue;
        }

        try {
          const task = this.createTaskFromData(taskData);
          this.memory.addTask(task, Date.now());
          WebSocketUtils.debug(`Loaded task into memory: ${taskData.content}`);
        } catch (taskError) {
          WebSocketUtils.error('Error creating task:', taskError, taskData);
        }
      }
    } catch (error) {
      WebSocketUtils.error('Error in loadInitialTasksToMemory:', error);
    }
  }

  createTaskFromData(taskData) {
    let term;
    let truth = taskData.truth || null;
    const content = taskData.content.replace(/[.!?:]+$/, '').trim();

    const impMatch = content.match(/\(([^(]+)-->([^)]+)\)/);
    if (impMatch) {
      const subject = impMatch[1].trim();
      const predicate = impMatch[2].trim();
      const subjTerm = Term.newAtom(subject);
      const predTerm = Term.newAtom(predicate);
      term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]);

      if (!truth) {
        truth = new TruthValue(0.8, 0.8);
      } else if (typeof truth === 'object' && !truth.hasOwnProperty('frequency')) {
        truth = new TruthValue(truth.frequency || 0.8, truth.confidence || 0.8);
      }
    } else {
      term = Term.newAtom(content);
      if (!truth) {
        truth = new TruthValue(0.5, 0.5);
      } else if (typeof truth === 'object' && !truth.hasOwnProperty('frequency')) {
        truth = new TruthValue(truth.frequency || 0.5, truth.confidence || 0.5);
      }
    }

    const punctuation = taskData.punctuation ||
      (taskData.content.endsWith('!') ? '!' : taskData.content.endsWith('?') ? '?' : '.');

    const task = new Task(
      term,
      punctuation,
      truth,
      taskData.createdAt || Date.now(),
      taskData.occurrenceTime || Date.now(),
      taskData.priority || 0.5
    );

    task.id = taskData.id;
    return task;
  }

  addTask(taskData) {
    if (!taskData.content) {
      throw new Error('Task content is required');
    }

    const newTaskData = {
      id: randomUUID(),
      content: taskData.content,
      priority: typeof taskData.priority === 'number' ? Math.max(0, Math.min(1, taskData.priority)) : 0.5,
      status: taskData.status || 'Input',
      type: taskData.type || 'Input',
      createdAt: Date.now(),
      lastModified: Date.now(),
      dependencies: Array.isArray(taskData.dependencies) ? taskData.dependencies : [],
      metadata: typeof taskData.metadata === 'object' ? taskData.metadata : {}
    };

    const task = this.createTaskFromData(newTaskData);
    this.memory.addTask(task, Date.now());

    return newTaskData.id;
  }

  updateTask(taskId, updates) {
    const task = this.memory.getTask(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const allowedFields = ['priority', 'status', 'type', 'content'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && key !== 'id') {
        if (key === 'priority') {
          task.priority = Math.max(0, Math.min(1, value));
        } else {
          task[key] = value;
        }
      }
    }

    if (task.setAccessedAt) {
      task.setAccessedAt(Date.now());
    }

    return true;
  }

  deleteTask(taskId) {
    return this.memory.removeTask(taskId);
  }

  getInitialTasks() {
    return [
      {
        id: 'task-1',
        content: '(a-->b).',
        priority: 0.9,
        status: 'Input',
        type: 'Input',
        createdAt: Date.now(),
        lastModified: Date.now()
      },
      {
        id: 'task-2',
        content: '(b-->c).',
        priority: 0.8,
        status: 'Input',
        type: 'Input',
        createdAt: Date.now(),
        lastModified: Date.now()
      }
    ];
  }

  getInitialConcepts() {
    return [
      { id: 'concept-a', content: 'a', priority: 0.9 },
      { id: 'concept-b', content: 'b', priority: 0.8 },
      { id: 'concept-c', content: 'c', priority: 0.7 }
    ];
  }

  getInitialLogs() {
    return [
      { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
      { id: 'log-2', message: 'Initial tasks loaded: (a-->b)., (b-->c).', timestamp: Date.now() }
    ];
  }
}

export default TaskDataManager;