import { WebSocketUtils } from './WebSocketUtils.js';

/**
 * Manages cognitive reasoning cycles and memory operations.
 * Extracted from FullFeaturedServer to improve modularity.
 */
class ReasoningManager {
  constructor(core) {
    this.core = core;
    this.reasoningInterval = null;
  }

  initialize() {
    this.memory = this.core?.memory;
    this.reasoner = this.core?.reasoner;
    this.selector = this.core?.selector;
  }

  startReasoningCycle() {
    if (!this.memory || !this.reasoner || !this.selector) {
      WebSocketUtils.warn('Core components not available for reasoning cycle');
      return;
    }

    this.loadInitialTasksToMemory();

    this.reasoningInterval = setInterval(() => {
      this.runCognitiveCycle();
    }, 1000);
  }

  runCognitiveCycle() {
    try {
      const context = new CycleContext(Date.now());
      runSingleCycle(this.memory, this.reasoner, this.selector, context);
    } catch (error) {
      WebSocketUtils.handleError('running cognitive cycle', error);
    }
  }

  loadInitialTasksToMemory() {
    try {
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          WebSocketUtils.warn('Task missing content, skipping:', taskData);
          continue;
        }

        this.createAndAddTask(taskData);
      }
    } catch (error) {
      WebSocketUtils.handleError('loading initial tasks to memory', error);
    }
  }

  createAndAddTask(taskData) {
    try {
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
      this.memory.addTask(task, Date.now());
      WebSocketUtils.debug(`Loaded task into memory: ${taskData.content}`);
    } catch (taskError) {
      WebSocketUtils.handleError('creating task', taskError, taskData);
    }
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

  stopReasoningCycle() {
    if (this.reasoningInterval) {
      clearInterval(this.reasoningInterval);
      this.reasoningInterval = null;
    }
  }

  reset() {
    this.stopReasoningCycle();
    if (this.memory) {
      // Reset memory state if method available
      this.memory.reset?.();
    }
    this.loadInitialTasksToMemory();
  }
}

export default ReasoningManager;