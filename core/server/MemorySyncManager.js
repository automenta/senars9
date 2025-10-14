import { WebSocketUtils } from './WebSocketUtils.js';

/**
 * Manages synchronization between memory and connected clients.
 * Extracted from FullFeaturedServer for better separation of concerns.
 */
class MemorySyncManager {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.mockDataInterval = null;
  }

  syncMemoryToClients() {
    try {
      const allMemoryTasks = this.wss.core?.memory?.getAllTasks ? this.wss.core.memory.getAllTasks() : [];
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
          WebSocketUtils.handleError('converting task', taskError, task);
          return null;
        }
      }).filter(task => task !== null);

      this.wss.broadcastState();
      WebSocketUtils.debug(`Synced ${tasksData.length} tasks from memory to clients`);
    } catch (error) {
      WebSocketUtils.handleError('syncing memory to clients', error);
    }
  }

  startMockData() {
    this.mockDataInterval = setInterval(() => {
      this.wss.broadcastState();
    }, 5000);
  }

  stopMockData() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
  }

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

  cleanup() {
    this.stopMockData();
  }
}

export default MemorySyncManager;