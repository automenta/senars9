import { WebSocketUtils } from './WebSocketUtils.js';
import CommonServerUtils from './CommonServerUtils.js';

class ServerCommandHandler {
  constructor(webSocketServer) {
    this.wss = webSocketServer;
  }

  async handleCommand(command, payload, isSimpleProtocol = false, ws = null) {
    WebSocketUtils.debug(`Received command: ${command}`, payload);

    try {
      switch (command) {
        case 'start':
          await this._handleStartCommand(isSimpleProtocol);
          break;
        case 'stop':
          await this._handleStopCommand(isSimpleProtocol);
          break;
        case 'step':
          await this._handleStepCommand(isSimpleProtocol);
          break;
        case 'reset':
          await this._handleResetCommand();
          break;
        case 'throttle':
          await this._handleThrottleCommand(payload, isSimpleProtocol);
          break;
        case 'add_task':
          await this._handleAddTaskCommand(payload);
          break;
        case 'update_task':
          await this._handleUpdateTaskCommand(payload);
          break;
        case 'delete_task':
          await this._handleDeleteTaskCommand(payload);
          break;
        case 'get_concepts':
          await this._handleGetConceptsCommand(isSimpleProtocol, ws);
          break;
        case 'get_top_tasks':
          await this._handleGetTopTasksCommand(isSimpleProtocol, ws);
          break;
        default:
          WebSocketUtils.debug(`Unknown command: ${command}`);
          break;
      }
    } catch (error) {
      WebSocketUtils.error(`Error handling command ${command}:`, error);
    }
  }

  async _handleStartCommand(isSimpleProtocol) {
    if (this.wss.yjsManager?.isEnabled()) {
      this.wss.yjsManager.setAwarenessState({
        isRunning: true,
        isPaused: false
      });
    }

    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }
  }

  async _handleStopCommand(isSimpleProtocol) {
    if (this.wss.yjsManager?.isEnabled()) {
      this.wss.yjsManager.setAwarenessState({
        isRunning: false,
        isPaused: true
      });
    }

    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }
  }

  async _handleStepCommand(isSimpleProtocol) {
    const context = new CycleContext(Date.now());
    runSingleCycle(memory, reasoner, selector, context);
    this.wss.syncMemoryToClients();

    if (this.wss.yjsManager?.isEnabled()) {
      const currentState = this.wss.yjsManager.getAwarenessState();
      const newCycleCount = (currentState.cycles || 0) + 1;
      this.wss.yjsManager.setAwarenessState({
        ...currentState,
        cycles: newCycleCount,
        isRunning: false,
        isPaused: true
      });
    }

    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }

    WebSocketUtils.debug('Cognitive cycle completed');
  }

  async _handleResetCommand() {
    // Reset memory and reasoning components
    memory = new Memory();
    reasoner = new Reasoner();
    selector = new FocusSetSelector();
    this.wss.taskDataManager.loadInitialTasksToMemory();

    if (this.wss.yjsManager?.isEnabled()) {
      this.wss.yjsManager.setAwarenessState({
        isRunning: false,
        isPaused: true,
        cycles: 0,
        concepts: 3,
        tasks: 2
      });

      this.wss.yjsManager.resetYjsData();
      // Re-populate Yjs with initial data
      const resetTasksData = this.wss.taskDataManager.getInitialTasks();
      resetTasksData.forEach(task => {
        const taskMap = new this.wss.yjsManager.Y.Map();
        Object.entries(task).forEach(([key, value]) => taskMap.set(key, value));
        this.wss.yjsManager.yTasks.push([taskMap]);
      });

      const resetConceptsData = this.wss.taskDataManager.getInitialConcepts();
      resetConceptsData.forEach(concept => {
        const conceptMap = new this.wss.yjsManager.Y.Map();
        Object.entries(concept).forEach(([key, value]) => conceptMap.set(key, value));
        this.wss.yjsManager.yConcepts.push([conceptMap]);
      });
    }

    this.wss.broadcastState();
  }

  async _handleThrottleCommand(payload, isSimpleProtocol) {
    if (this.wss.yjsManager?.isEnabled()) {
      this.wss.yjsManager.setAwarenessState({});
    }

    if (isSimpleProtocol) {
      this.wss.broadcastState();
    }
  }

  async _handleAddTaskCommand(payload) {
    if (!payload.content) {
      throw new Error('Add task command failed: missing content');
    }

    const taskId = this.wss.taskDataManager.addTask(payload);
    this.wss.syncMemoryToClients();

    if (this.wss.yjsManager?.isEnabled()) {
      const addTaskState = this.wss.yjsManager.getAwarenessState();
      this.wss.yjsManager.setAwarenessState({
        ...addTaskState,
        tasks: this.wss.yjsManager.yTasks.length
      });
    }
  }

  async _handleUpdateTaskCommand(payload) {
    const taskId = payload.id;
    if (!taskId) {
      throw new Error('Update task command failed: missing task ID');
    }

    this.wss.taskDataManager.updateTask(taskId, payload);
    this.wss.syncMemoryToClients();

    if (this.wss.yjsManager?.isEnabled()) {
      this.wss.yjsManager.setAwarenessState({});
    }
  }

  async _handleDeleteTaskCommand(payload) {
    const taskId = payload.id;
    if (!taskId) {
      throw new Error('Delete task command failed: missing task ID');
    }

    const removed = this.wss.taskDataManager.deleteTask(taskId);
    if (!removed) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    this.wss.syncMemoryToClients();

    if (this.wss.yjsManager?.isEnabled()) {
      this.wss.yjsManager.setAwarenessState({
        tasks: this.wss.yjsManager.yTasks.length
      });
    }
  }

  async _handleGetConceptsCommand(isSimpleProtocol, ws) {
    if (this.wss.memory && this.wss.memory.getTopConcepts) {
      const topConcepts = this.wss.memory.getTopConcepts(20);
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
        const response = {
          type: 'concepts_update',
          payload: conceptsData
        };
        ws.send(JSON.stringify(response));
      }
    } else {
      WebSocketUtils.warn('Memory not initialized or getTopConcepts method not available');
    }
  }

  async _handleGetTopTasksCommand(isSimpleProtocol, ws) {
    if (this.wss.memory && this.wss.memory.getTopTasks) {
      const topTasks = this.wss.memory.getTopTasks(20);
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
        const response = {
          type: 'top_tasks_update',
          payload: tasksData
        };
        ws.send(JSON.stringify(response));
      }
    } else {
      WebSocketUtils.warn('Memory not initialized or getTopTasks method not available');
    }
  }
}

export default ServerCommandHandler;