import { WebSocketUtils, MESSAGE_TYPES } from './WebSocketUtils.js';

/**
 * Handles WebSocket commands for server control and task management.
 * Extracted from FullFeaturedServer for better organization.
 */
class CommandHandler {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
    this.core = webSocketServer.core;
  }

  async handleCommand(command, payload, isSimpleProtocol = false, ws = null) {
    WebSocketUtils.debug(`Received command: ${command}`, payload);

    try {
      switch (command) {
        case 'start':
          return this.handleStartCommand(isSimpleProtocol);
        case 'stop':
          return this.handleStopCommand(isSimpleProtocol);
        case 'step':
          return this.handleStepCommand(isSimpleProtocol);
        case 'reset':
          return this.handleResetCommand(isSimpleProtocol);
        case 'throttle':
          return this.handleThrottleCommand(payload, isSimpleProtocol);
        case 'add_task':
          return this.handleAddTaskCommand(payload);
        case 'update_task':
          return this.handleUpdateTaskCommand(payload);
        case 'delete_task':
          return this.handleDeleteTaskCommand(payload);
        case 'get_concepts':
          return this.handleGetConceptsCommand(isSimpleProtocol, ws);
        case 'get_top_tasks':
          return this.handleGetTopTasksCommand(isSimpleProtocol, ws);
        default:
          WebSocketUtils.debug(`Unknown command: ${command}`);
          return false;
      }
    } catch (error) {
      WebSocketUtils.handleError(`handling command ${command}`, error);
      return false;
    }
  }

  handleStartCommand(isSimpleProtocol) {
    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }
    return true;
  }

  handleStopCommand(isSimpleProtocol) {
    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }
    return true;
  }

  handleStepCommand(isSimpleProtocol) {
    try {
      const context = new CycleContext(Date.now());
      runSingleCycle(this.core.memory, this.core.reasoner, this.core.selector, context);

      if (isSimpleProtocol) {
        this.wss.broadcastState();
      }

      WebSocketUtils.debug('Cognitive cycle completed');
      return true;
    } catch (error) {
      WebSocketUtils.handleError('executing step command', error);
      return false;
    }
  }

  handleResetCommand(isSimpleProtocol) {
    try {
      // Reset core components if available
      if (this.core.memory) this.core.memory.reset?.();
      if (this.core.reasoner) this.core.reasoner.reset?.();
      if (this.core.cycle) this.core.cycle.cycleCount = 0;

      this.wss.broadcastState();
      return true;
    } catch (error) {
      WebSocketUtils.handleError('executing reset command', error);
      return false;
    }
  }

  handleThrottleCommand(payload, isSimpleProtocol) {
    WebSocketUtils.debug(`Throttle command: ${payload?.value}%`);
    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }
    return true;
  }

  handleAddTaskCommand(payload) {
    if (!payload?.content) {
      WebSocketUtils.error('Add task command failed: missing content');
      return false;
    }

    try {
      const newTaskData = {
        id: WebSocketUtils.generateId('task'),
        content: payload.content,
        priority: typeof payload.priority === 'number' ? Math.max(0, Math.min(1, payload.priority)) : 0.5,
        status: payload.status || 'Input',
        type: payload.type || 'Input',
        createdAt: Date.now(),
        lastModified: Date.now(),
        dependencies: Array.isArray(payload.dependencies) ? payload.dependencies : [],
        metadata: typeof payload.metadata === 'object' ? payload.metadata : {}
      };

      let term;
      let truth = new TruthValue(0.8, 0.8);
      const content = newTaskData.content.replace(/[.!?:]+$/, '').trim();

      const impMatch = content.match(/\(([^(]+)-->([^)]+)\)/);
      if (impMatch) {
        const subject = impMatch[1].trim();
        const predicate = impMatch[2].trim();
        const subjTerm = Term.newAtom(subject);
        const predTerm = Term.newAtom(predicate);
        term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]);
      } else {
        term = Term.newAtom(content);
      }

      const task = new Task(term, '.', truth, newTaskData.createdAt, newTaskData.createdAt, newTaskData.priority);
      task.id = newTaskData.id;

      if (this.core.memory) {
        this.core.memory.addTask(task, Date.now());
        return true;
      }

      return false;
    } catch (error) {
      WebSocketUtils.handleError('adding task', error);
      return false;
    }
  }

  handleUpdateTaskCommand(payload) {
    const updateTaskId = payload?.id;
    if (!updateTaskId) {
      WebSocketUtils.error('Update task command failed: missing task ID');
      return false;
    }

    const taskToUpdate = this.core.memory?.getTask(updateTaskId);
    if (!taskToUpdate) {
      WebSocketUtils.error(`Update task command failed: task with ID ${updateTaskId} not found`);
      return false;
    }

    const allowedFields = ['priority', 'status', 'type', 'content'];
    for (const [key, value] of Object.entries(payload)) {
      if (allowedFields.includes(key) && key !== 'id') {
        if (key === 'priority') {
          taskToUpdate.priority = Math.max(0, Math.min(1, value));
        } else {
          taskToUpdate[key] = value;
        }
      }
    }

    if (taskToUpdate.setAccessedAt) {
      taskToUpdate.setAccessedAt(Date.now());
    }

    return true;
  }

  handleDeleteTaskCommand(payload) {
    const removeTaskId = payload?.id;
    if (!removeTaskId) {
      WebSocketUtils.error('Delete task command failed: missing task ID');
      return false;
    }

    const removed = this.core.memory?.removeTask(removeTaskId);
    if (!removed) {
      WebSocketUtils.error(`Delete task command failed: task with ID ${removeTaskId} not found`);
      return false;
    }

    return true;
  }

  handleGetConceptsCommand(isSimpleProtocol, ws) {
    if (!this.core.memory?.getTopConcepts) {
      WebSocketUtils.warn('Memory not initialized or getTopConcepts method not available');
      return false;
    }

    try {
      const topConcepts = this.core.memory.getTopConcepts(20);
      const conceptsData = topConcepts.map((item, index) => ({
        id: item.id || `concept-${index}`,
        content: item.term?.name || item.concept?.term?.name || `Concept-${index}`,
        priority: item.priority || 0.5,
        name: item.term?.name || item.concept?.term?.name || `Concept-${index}`,
        type: 'concept',
        taskCount: item.taskCount || 0,
        createdAt: item.createdAt || Date.now()
      }));

      if (isSimpleProtocol && ws) {
        const response = WebSocketUtils.createMessage('concepts_update', conceptsData);
        ws.send(JSON.stringify(response));
      }

      return true;
    } catch (error) {
      WebSocketUtils.handleError('getting concepts', error);
      return false;
    }
  }

  handleGetTopTasksCommand(isSimpleProtocol, ws) {
    if (!this.core.memory?.getTopTasks) {
      WebSocketUtils.warn('Memory not initialized or getTopTasks method not available');
      return false;
    }

    try {
      const topTasks = this.core.memory.getTopTasks(20);
      const tasksData = topTasks.map((task, index) => ({
        id: task.id || `task-${Date.now()}-${index}`,
        content: task.toString ? task.toString() : (task.content || `Task-${index}`),
        priority: task.getPriority ? task.getPriority() : (task.priority || 0.5),
        status: task.status || 'Derived',
        type: task.isBelief ? (task.isBelief() ? 'Belief' : task.isGoal() ? 'Goal' : 'Question') : (task.type || 'Derived'),
        createdAt: task.createdAt || Date.now(),
        lastModified: task.getAccessedAt ? task.getAccessedAt() : Date.now(),
        punctuation: task.punctuation || '.',
        truth: task.truth || null,
        occurrenceTime: task.occurrenceTime || Date.now(),
        derivationPath: task.derivationPath || []
      }));

      if (isSimpleProtocol && ws) {
        const response = WebSocketUtils.createMessage('top_tasks_update', tasksData);
        ws.send(JSON.stringify(response));
      }

      return true;
    } catch (error) {
      WebSocketUtils.handleError('getting top tasks', error);
      return false;
    }
  }
}

export default CommandHandler;