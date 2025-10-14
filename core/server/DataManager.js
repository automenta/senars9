import { WebSocketUtils } from './WebSocketUtils.js';
import { randomUUID } from 'crypto';

/**
 * Unified data management for tasks, concepts, and memory synchronization.
 * Consolidates TaskDataManager and MemorySyncManager functionality for DRY compliance.
 */
class DataManager {
  constructor(memory = null, webSocketServer = null) {
    this.memory = memory;
    this.wss = webSocketServer;
    this.mockDataInterval = null;
  }

  // Task Management Methods
  loadInitialTasks() {
    try {
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          WebSocketUtils.warn('Task missing content, skipping:', taskData);
          continue;
        }

        try {
          const task = this.createTask(taskData);
          this.memory?.addTask(task, Date.now());
          WebSocketUtils.debug(`Loaded task: ${taskData.content}`);
        } catch (taskError) {
          WebSocketUtils.error('Error creating task:', taskError, taskData);
        }
      }
    } catch (error) {
      WebSocketUtils.error('Error loading initial tasks:', error);
    }
  }

  createTask(taskData) {
    const { term, truth } = this.parseTaskContent(taskData.content, taskData.truth);

    const punctuation = taskData.punctuation || this.inferPunctuation(taskData.content);

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

  parseTaskContent(content, truthValue = null) {
    const cleanContent = content.replace(/[.!?:]+$/, '').trim();

    const impMatch = cleanContent.match(/\(([^(]+)-->([^)]+)\)/);
    if (impMatch) {
      return this.createInheritanceTerm(impMatch[1].trim(), impMatch[2].trim(), truthValue);
    }

    return this.createAtomicTerm(cleanContent, truthValue);
  }

  createInheritanceTerm(subject, predicate, truthValue) {
    const subjTerm = Term.newAtom(subject);
    const predTerm = Term.newAtom(predicate);
    const term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]);

    const truth = this.normalizeTruthValue(truthValue, 0.8, 0.8);

    return { term, truth };
  }

  createAtomicTerm(content, truthValue) {
    const term = Term.newAtom(content);
    const truth = this.normalizeTruthValue(truthValue, 0.5, 0.5);

    return { term, truth };
  }

  normalizeTruthValue(truthValue, defaultFreq, defaultConf) {
    if (!truthValue) {
      return new TruthValue(defaultFreq, defaultConf);
    }

    if (typeof truthValue === 'object' && !truthValue.hasOwnProperty('frequency')) {
      return new TruthValue(truthValue.frequency || defaultFreq, truthValue.confidence || defaultConf);
    }

    return truthValue;
  }

  inferPunctuation(content) {
    if (content.endsWith('!')) return '!';
    if (content.endsWith('?')) return '?';
    return '.';
  }

  addTask(taskData) {
    if (!taskData.content) {
      throw new Error('Task content is required');
    }

    if (!this.memory) {
      throw new Error('Memory not initialized');
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

    const task = this.createTask(newTaskData);
    this.memory.addTask(task, Date.now());

    return newTaskData.id;
  }

  updateTask(taskId, updates) {
    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

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
    if (!this.memory) {
      throw new Error('Memory not initialized');
    }

    return this.memory.removeTask(taskId);
  }

  // Memory Synchronization Methods
  syncMemoryToClients() {
    if (!this.wss?.core?.memory) return;

    try {
      const allMemoryTasks = this.wss.core.memory.getAllTasks?.() || [];
      if (!Array.isArray(allMemoryTasks) || allMemoryTasks.length === 0) return;

      const tasksData = allMemoryTasks.map((task, index) => {
        if (!task) return null;

        const taskId = task.id || `task_${task.createdAt || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          return {
            id: taskId,
            content: task.toString ? task.toString() : (task.content || 'Unknown Task'),
            priority: task.getPriority ? task.getPriority() : (task.priority || 0.5),
            status: task.status || 'Derived',
            type: task.isBelief ? (task.isBelief() ? 'Belief' : task.isGoal() ? 'Goal' : 'Question') : (task.type || 'Derived'),
            createdAt: task.createdAt || Date.now(),
            lastModified: task.getAccessedAt ? task.getAccessedAt() : Date.now(),
            punctuation: task.punctuation || (task.content?.endsWith('!') ? '!' : task.content?.endsWith('?') ? '?' : '.'),
            truth: task.truth || null,
            occurrenceTime: task.occurrenceTime || Date.now(),
            derivationPath: task.derivationPath || []
          };
        } catch (taskError) {
          WebSocketUtils.error('Error converting task:', taskError, task);
          return null;
        }
      }).filter(task => task !== null);

      this.wss.broadcastState();
      WebSocketUtils.debug(`Synced ${tasksData.length} tasks to clients`);
    } catch (error) {
      WebSocketUtils.error('Error syncing memory to clients:', error);
    }
  }

  startMockData(interval = 5000) {
    this.stopMockData();
    this.mockDataInterval = setInterval(() => {
      this.wss?.broadcastState();
    }, interval);
  }

  stopMockData() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

  // State Management Methods
  getCurrentState() {
    return {
      tasks: this.getInitialTasks(),
      concepts: this.getInitialConcepts(),
      logs: this.getInitialLogs()
    };
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

  // Cleanup
  cleanup() {
    this.stopMockData();
  }
}

export default DataManager;