import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import WebSocketServerBase from './WebSocketServer.js';
import { WebSocketUtils } from './WebSocketUtils.js';

// Optional Yjs CRDT support - can be enabled via environment variable or config
const useYjs = process.env.ENABLE_YJS === 'true' || process.env.YJS_CRDT === 'true';

let yClients = new Set();
let simpleClients = new Set();
const clients = new Set();

// Import Yjs components only if enabled
let Y, Awareness, setupWSConnection, doc, yTasks, yConcepts, yLogs, awareness;

if (useYjs) {
  try {
    Y = (await import('yjs')).default;
    const awarenessModule = await import('y-protocols/awareness');
    Awareness = awarenessModule.Awareness;
    const wsModule = await import('y/websocket-server/utils');
    setupWSConnection = wsModule.setupWSConnection;

    // Initialize Yjs document and arrays
    doc = new Y.Doc();
    yTasks = doc.getArray('tasks');
    yConcepts = doc.getArray('concepts');
    yLogs = doc.getArray('logs');
    awareness = new Awareness(doc);

    WebSocketUtils.debug('Yjs CRDT support enabled');
  } catch (error) {
    WebSocketUtils.error('Failed to load Yjs modules:', error.message);
    WebSocketUtils.debug('Falling back to simple protocol only');
  }
} else {
  WebSocketUtils.debug('Running with simple WebSocket protocol only');
}

// Reasoning system components
let memory, reasoner, selector;
let reasoningInterval = null;

class FullFeaturedServer extends WebSocketServerBase {
  constructor(core, port = 8080) {
    super(core);
    this.port = port;
    this.httpServer = new Server((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('okay');
    });
    this.mockDataInterval = null;
  }

  syncMemoryToClients() {
    try {
      const allMemoryTasks = memory?.getAllTasks ? memory.getAllTasks() : [];
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

      if (useYjs && yTasks) {
        this.syncMemoryToYjs(tasksData);
      }

      this.broadcastState();
      WebSocketUtils.debug(`Synced ${tasksData.length} tasks from memory to clients`);
    } catch (error) {
      WebSocketUtils.error('Error in syncMemoryToClients:', error);
    }
  }

  syncMemoryToYjs(tasksData) {
    if (!useYjs || !yTasks) return;

    try {
      const yTaskIds = new Set();
      yTasks.forEach(yTask => {
        if (yTask instanceof Y.Map) {
          const id = yTask.get('id');
          if (id) yTaskIds.add(id);
        }
      });

      for (const taskObj of tasksData) {
        if (!taskObj || yTaskIds.has(taskObj.id)) continue;

        try {
          const taskMap = new Y.Map();
          Object.entries(taskObj).forEach(([key, value]) => {
            taskMap.set(key, value);
          });
          yTasks.push([taskMap]);
          WebSocketUtils.debug(`Added derived task to Yjs: ${taskObj.content}`);
        } catch (taskError) {
          WebSocketUtils.error('Error converting task for Yjs sync:', taskError, taskObj);
        }
      }
    } catch (error) {
      WebSocketUtils.error('Error in syncMemoryToYjs:', error);
    }
  }

  startReasoningCycle() {
    memory = new Memory();
    reasoner = new Reasoner();
    selector = new FocusSetSelector();

    import('./reasoning/SyllogisticRules.js').then(({ DeductiveSyllogism, Induction, Abduction }) => {
      reasoner.addRule(new DeductiveSyllogism());
      reasoner.addRule(new Induction());
      reasoner.addRule(new Abduction());
      WebSocketUtils.debug('Reasoning rules registered for task derivation');
    }).catch(err => {
      WebSocketUtils.error('Failed to import reasoning rules:', err);
    });

    this.loadInitialTasksToMemory();

    reasoningInterval = setInterval(() => {
      const context = new CycleContext(Date.now());
      runSingleCycle(memory, reasoner, selector, context);
      this.syncMemoryToClients();
    }, 1000);
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
          memory.addTask(task, Date.now());
          WebSocketUtils.debug(`Loaded task into memory: ${taskData.content}`);
        } catch (taskError) {
          WebSocketUtils.error('Error creating task:', taskError, taskData);
        }
      }
    } catch (error) {
      WebSocketUtils.error('Error in loadInitialTasksToMemory:', error);
    }
  }

  getCurrentState() {
    return useYjs && yTasks ? this.convertYjsToPlain() : {
      tasks: this.getInitialTasks(),
      concepts: this.getInitialConcepts(),
      logs: this.getInitialLogs()
    };
  }

  convertYjsToPlain() {
    if (!useYjs || !yTasks) {
      return {
        tasks: this.getInitialTasks(),
        concepts: this.getInitialConcepts(),
        logs: this.getInitialLogs()
      };
    }

    const convertYjsMap = (yItem) => {
      if (yItem instanceof Y.Map) {
        const obj = {};
        yItem.forEach((value, key) => obj[key] = value);
        return obj;
      }
      return yItem;
    };

    return {
      tasks: yTasks.toArray().map(convertYjsMap),
      concepts: yConcepts.toArray().map(convertYjsMap),
      logs: yLogs.toArray().map(convertYjsMap)
    };
  }

  broadcastState() {
    const state = this.getCurrentState();

    let stats;
    if (useYjs && awareness) {
      stats = awareness.getLocalState()?.reasonerStats || {
        isRunning: false,
        isPaused: true,
        cycles: 0,
        tasks: yTasks.length,
        concepts: yConcepts.length,
        timestamp: Date.now()
      };
      stats.tasks = yTasks.length;
      stats.concepts = yConcepts.length;
    } else {
      stats = {
        isRunning: false,
        isPaused: true,
        cycles: 0,
        tasks: state.tasks.length,
        concepts: state.concepts.length,
        timestamp: Date.now()
      };
    }

    const message = {
      type: 'state_update',
      payload: { ...state, stats }
    };

    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(messageStr);
      }
    });
  }

  // Get initial tasks data
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

  // Get initial concepts data
  getInitialConcepts() {
    return [
      { id: 'concept-a', content: 'a', priority: 0.9 },
      { id: 'concept-b', content: 'b', priority: 0.8 },
      { id: 'concept-c', content: 'c', priority: 0.7 }
    ];
  }

  // Get initial logs data
  getInitialLogs() {
    return [
      { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
      { id: 'log-2', message: 'Initial tasks loaded: (a-->b)., (b-->c).', timestamp: Date.now() }
    ];
  }

  loadInitialData() {
    WebSocketUtils.debug('Loading initial data...');
    WebSocketUtils.debug('Initial data loaded.');
  }

  startMockData() {
    this.mockDataInterval = setInterval(() => {
      this.broadcastState();
    }, 5000);
  }

  async handleControlCommand(command, payload, isSimpleProtocol = false, ws = null) {
    WebSocketUtils.debug(`Received command: ${command}`, payload);

    try {
      switch (command) {
        case 'start':
          WebSocketUtils.debug('Start command received');
          if (useYjs && awareness) {
            const startState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...startState,
              isRunning: true,
              isPaused: false,
              timestamp: Date.now()
            });
          }

          if (isSimpleProtocol) {
            this.broadcastState();
          }
          break;
        case 'stop':
          WebSocketUtils.debug('Stop command received');
          if (useYjs && awareness) {
            const stopState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...stopState,
              isRunning: false,
              isPaused: true,
              timestamp: Date.now()
            });
          }

          if (isSimpleProtocol) {
            this.broadcastState();
          }
          break;
        case 'step':
          WebSocketUtils.debug('Step command received - executing single cognitive cycle');
          const context = new CycleContext(Date.now());
          runSingleCycle(memory, reasoner, selector, context);
          this.syncMemoryToClients();

          if (useYjs && awareness) {
            const currentState = awareness.getLocalState()?.reasonerStats || {};
            const newCycleCount = (currentState.cycles || 0) + 1;
            awareness.setLocalStateField('reasonerStats', {
              ...currentState,
              cycles: newCycleCount,
              isRunning: false,
              isPaused: true,
              concepts: yConcepts.length,
              tasks: yTasks.length,
              timestamp: Date.now()
            });
          }

          if (isSimpleProtocol) {
            this.broadcastState();
          }

          WebSocketUtils.debug('Cognitive cycle completed');
          break;
        case 'reset':
          WebSocketUtils.debug('Reset command received');
          memory = new Memory();
          reasoner = new Reasoner();
          selector = new FocusSetSelector();
          this.loadInitialTasksToMemory();

          if (useYjs && awareness) {
            awareness.setLocalStateField('reasonerStats', {
              isRunning: false,
              isPaused: true,
              cycles: 0,
              concepts: 3,
              tasks: 2,
              timestamp: Date.now()
            });

            yTasks.delete(0, yTasks.length);
            yConcepts.delete(0, yConcepts.length);

            const resetTasksData = [
              { id: 'task-1', content: '(a-->b).', priority: 0.9, status: 'Input', type: 'Input', createdAt: Date.now(), lastModified: Date.now() },
              { id: 'task-2', content: '(b-->c).', priority: 0.8, status: 'Input', type: 'Input', createdAt: Date.now(), lastModified: Date.now() }
            ];

            resetTasksData.forEach(task => {
              const taskMap = new Y.Map();
              Object.entries(task).forEach(([key, value]) => taskMap.set(key, value));
              yTasks.push([taskMap]);
            });

            const resetConceptsData = [
              { id: 'concept-a', content: 'a', priority: 0.9 },
              { id: 'concept-b', content: 'b', priority: 0.8 },
              { id: 'concept-c', content: 'c', priority: 0.7 }
            ];

            resetConceptsData.forEach(concept => {
              const conceptMap = new Y.Map();
              Object.entries(concept).forEach(([key, value]) => conceptMap.set(key, value));
              yConcepts.push([conceptMap]);
            });
          }

          this.broadcastState();
          break;
        case 'throttle':
          WebSocketUtils.debug(`Throttle command: ${payload.value}%`);
          if (useYjs && awareness) {
            const throttleState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...throttleState,
              timestamp: Date.now()
            });
          }

          if (isSimpleProtocol) {
            this.broadcastState();
          }
          break;
        case 'add_task':
          WebSocketUtils.debug('Add task command received');
          if (!payload.content) {
            WebSocketUtils.error('Add task command failed: missing content');
            return;
          }

          const newTaskData = {
            id: randomUUID(),
            content: payload.content,
            priority: typeof payload.priority === 'number' ? Math.max(0, Math.min(1, payload.priority)) : 0.5,
            status: payload.status || 'Input',
            type: payload.type || 'Input',
            createdAt: Date.now(),
            lastModified: Date.now(),
            dependencies: Array.isArray(payload.dependencies) ? payload.dependencies : [],
            metadata: typeof payload.metadata === 'object' ? payload.metadata : {}
          };

          try {
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
            memory.addTask(task, Date.now());
            this.syncMemoryToClients();

            if (useYjs && awareness) {
              const addTaskState = awareness.getLocalState()?.reasonerStats || {};
              awareness.setLocalStateField('reasonerStats', {
                ...addTaskState,
                tasks: yTasks.length,
                timestamp: Date.now()
              });
            }
          } catch (error) {
            WebSocketUtils.error('Error adding task to memory:', error);
          }
          break;
        case 'update_task':
          WebSocketUtils.debug('Update task command received');
          const updateTaskId = payload.id;
          if (!updateTaskId) {
            WebSocketUtils.error('Update task command failed: missing task ID');
            return;
          }

          const taskToUpdate = memory.getTask(updateTaskId);
          if (taskToUpdate) {
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

            this.syncMemoryToClients();

            if (useYjs && awareness) {
              const updateTaskState = awareness.getLocalState()?.reasonerStats || {};
              awareness.setLocalStateField('reasonerStats', {
                ...updateTaskState,
                timestamp: Date.now()
              });
            }
          } else {
            WebSocketUtils.error(`Update task command failed: task with ID ${updateTaskId} not found`);
          }
          break;
        case 'delete_task':
          WebSocketUtils.debug('Delete task command received');
          const removeTaskId = payload.id;
          if (!removeTaskId) {
            WebSocketUtils.error('Delete task command failed: missing task ID');
            return;
          }

          const removed = memory.removeTask(removeTaskId);
          if (removed) {
            this.syncMemoryToClients();

            if (useYjs && awareness) {
              const deleteTaskState = awareness.getLocalState()?.reasonerStats || {};
              awareness.setLocalStateField('reasonerStats', {
                ...deleteTaskState,
                tasks: yTasks.length,
                timestamp: Date.now()
              });
            }
          } else {
            WebSocketUtils.error(`Delete task command failed: task with ID ${removeTaskId} not found`);
          }
          break;
        case 'get_concepts':
          WebSocketUtils.debug('Get concepts command received');
          if (memory && memory.getTopConcepts) {
            const topConcepts = memory.getTopConcepts(20);
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
          break;
        case 'get_top_tasks':
          WebSocketUtils.debug('Get top tasks command received');
          if (memory && memory.getTopTasks) {
            const topTasks = memory.getTopTasks(20);
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
          break;

        default:
          WebSocketUtils.debug(`Unknown command: ${command}`);
          break;
      }
    } catch (error) {
      WebSocketUtils.error(`Error handling command ${command}:`, error);
    }
  }

  async start() {
    await super.start();
    this.loadInitialData();

    if (useYjs && yTasks && awareness) {
      yTasks.observe(() => this.broadcastState());
      yConcepts.observe(() => this.broadcastState());
      yLogs.observe(() => this.broadcastState());
      awareness.on('change', () => this.broadcastState());
      WebSocketUtils.debug('Yjs observers set up for automatic state broadcasting');
    }

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', (error) => {
        if (error) {
          WebSocketUtils.error('Server error:', error);
          reject(error);
        } else {
          WebSocketUtils.debug(`FullFeatured server listening on port ${this.port}`);
          if (useYjs) {
            WebSocketUtils.debug('Yjs CRDT support enabled - both protocols supported');
          } else {
            WebSocketUtils.debug('Simple WebSocket protocol only');
          }
          resolve();
        }
      });
    });

    this.startMockData();
    this.startReasoningCycle();
  }

  async stop() {
    await super.stop();

    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    if (reasoningInterval) {
      clearInterval(reasoningInterval);
    }

    clients.forEach(client => {
      try {
        client.close();
      } catch (e) {
        WebSocketUtils.error('Error closing client:', e);
      }
    });
    clients.clear();

    simpleClients.clear();
    if (useYjs) {
      yClients.clear();
    }

    return new Promise((resolve) => {
      this.httpServer.close(() => {
        WebSocketUtils.debug('FullFeatured server closed');
        resolve();
      });
    });
  }
}

async function main() {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new FullFeaturedServer(null, port);

  try {
    await server.start();
    WebSocketUtils.debug(`FullFeatured server initialized on port ${port}`);
  } catch (error) {
    WebSocketUtils.error('Failed to start server:', error);
    process.exit(1);
  }

  const shutdown = async () => {
    WebSocketUtils.debug('Received shutdown signal, shutting down gracefully');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default FullFeaturedServer;
