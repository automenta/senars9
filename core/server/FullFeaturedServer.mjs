import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';

// Optional Yjs CRDT support - can be enabled via environment variable or config
const useYjs = process.env.ENABLE_YJS === 'true' || process.env.YJS_CRDT === 'true';

let yClients = new Set();
let simpleClients = new Set();

// All WebSocket clients (both Yjs and simple protocol)
const clients = new Set();

import { Memory } from './Memory.js';
import { Reasoner } from './Reasoner.js';
import { FocusSetSelector } from './FocusSetSelector.js';
import { runSingleCycle, CycleContext } from './Cycle.js';
import { Task, TruthValue } from './Task.js';
import { Term, TermType } from './Term.js';

// Import Yjs components only if enabled
let Y, Awareness, setupWSConnection, doc, yTasks, yConcepts, yLogs, awareness;

if (useYjs) {
  try {
    Y = (await import('yjs')).default;
    const awarenessModule = await import('y-protocols/awareness');
    Awareness = awarenessModule.Awareness;
    const wsModule = await import('@y/websocket-server/utils');
    setupWSConnection = wsModule.setupWSConnection;

    // Initialize Yjs document and arrays
    doc = new Y.Doc();
    yTasks = doc.getArray('tasks');
    yConcepts = doc.getArray('concepts');
    yLogs = doc.getArray('logs');
    awareness = new Awareness(doc);

    console.log('✅ Yjs CRDT support enabled');
  } catch (error) {
    console.error('❌ Failed to load Yjs modules:', error.message);
    console.log('🔄 Falling back to simple protocol only');
  }
} else {
  console.log('📡 Running with simple WebSocket protocol only');
}

// Reasoning system components
let memory, reasoner, selector;
let reasoningInterval = null;

// Add observer to Yjs arrays to automatically broadcast changes to simple protocol clients - will be set up in start()

class SenarsServer {
  constructor(port = 8080) {
    this.port = port;
    this.httpServer = new Server((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('okay');
    });
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.mockDataInterval = null;
  }

  // Synchronize tasks from memory to local storage and broadcast to clients
  syncMemoryToClients() {
    try {
      // Get all tasks from memory
      const allMemoryTasks = memory?.getAllTasks ? memory.getAllTasks() : [];

      if (!Array.isArray(allMemoryTasks) || allMemoryTasks.length === 0) {
        return; // No tasks to sync
      }

      // Convert tasks to the format expected by UI
      const tasksData = allMemoryTasks.map((task, index) => {
        if (!task) return null;

        // Create an ID for the task if it doesn't have one
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
          console.error('Error converting task:', taskError, task);
          return null;
        }
      }).filter(task => task !== null);

      // Sync to Yjs if enabled
      if (useYjs && yTasks) {
        this.syncMemoryToYjs(tasksData);
      }

      // Broadcast updated state to all connected clients
      this.broadcastState();

      console.log(`Synced ${tasksData.length} tasks from memory to clients`);
    } catch (error) {
      console.error('Error in syncMemoryToClients:', error);
    }
  }

  // Synchronize tasks from memory to Yjs arrays (when Yjs is enabled)
  syncMemoryToYjs(tasksData) {
    if (!useYjs || !yTasks) return;

    try {
      // Create a set of task IDs currently in Yjs for comparison
      const yTaskIds = new Set();
      yTasks.forEach(yTask => {
        if (yTask instanceof Y.Map) {
          const id = yTask.get('id');
          if (id) {
            yTaskIds.add(id);
          }
        }
      });

      // Add tasks that exist in memory but not in Yjs
      for (const taskObj of tasksData) {
        if (!taskObj || yTaskIds.has(taskObj.id)) continue;

        try {
          const taskMap = new Y.Map();
          Object.entries(taskObj).forEach(([key, value]) => {
            taskMap.set(key, value);
          });
          yTasks.push([taskMap]);

          console.log(`Added derived task to Yjs: ${taskObj.content}`);
        } catch (taskError) {
          console.error('Error converting task for Yjs sync:', taskError, taskObj);
        }
      }
    } catch (error) {
      console.error('Error in syncMemoryToYjs:', error);
    }
  }

  // Start the reasoning cycle that will generate derived tasks
  startReasoningCycle() {
    // Initialize reasoning components
    memory = new Memory();
    reasoner = new Reasoner();
    selector = new FocusSetSelector();

    // Register reasoning rules that can derive new tasks
    import('./reasoning/SyllogisticRules.js').then(({ DeductiveSyllogism, Induction, Abduction }) => {
      reasoner.addRule(new DeductiveSyllogism());
      reasoner.addRule(new Induction());
      reasoner.addRule(new Abduction());
      console.log('✅ Reasoning rules registered for task derivation');
    }).catch(err => {
      console.error('Failed to import reasoning rules:', err);
    });

    // Load initial tasks into memory so they can be reasoned about
    this.loadInitialTasksToMemory();

    // Set up interval for running reasoning cycles
    reasoningInterval = setInterval(() => {
      // Run a single cognitive cycle
      const context = new CycleContext(Date.now());
      runSingleCycle(memory, reasoner, selector, context);

      // Sync new tasks from memory to clients
      this.syncMemoryToClients();
    }, 1000);
  }
  
  // Load initial tasks into memory so they can be processed by the reasoning system
  loadInitialTasksToMemory() {
    try {
      // Load initial tasks that were added to local storage
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          console.warn('Task missing content, skipping:', taskData);
          continue;
        }

        try {
          // Create a simple Term - use the content to generate appropriate term structure
          let term;
          let truth = taskData.truth || null;
          const content = taskData.content.replace(/[.!?:]+$/, '').trim();

          // Try to parse simple implication format like "(a-->b)"
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

          // Create Task object
          let punctuation = taskData.punctuation || '.';
          if (taskData.content && taskData.content.endsWith('!')) {
            punctuation = '!';
          } else if (taskData.content && taskData.content.endsWith('?')) {
            punctuation = '?';
          } else if (taskData.content && taskData.content.endsWith('.')) {
            punctuation = '.';
          }

          const task = new Task(
            term,
            punctuation,
            truth,
            taskData.createdAt || Date.now(),
            taskData.occurrenceTime || Date.now(),
            taskData.priority || 0.5
          );

          task.id = taskData.id;

          // Add to memory
          memory.addTask(task, Date.now());
          console.log(`Loaded task into memory: ${taskData.content}`);
        } catch (taskError) {
          console.error('Error creating task:', taskError, taskData);
        }
      }
    } catch (error) {
      console.error('Error in loadInitialTasksToMemory:', error);
    }
  }

  // Get current state from local storage or Yjs
  getCurrentState() {
    if (useYjs && yTasks) {
      return this.convertYjsToPlain();
    } else {
      return {
        tasks: this.getInitialTasks(),
        concepts: this.getInitialConcepts(),
        logs: this.getInitialLogs()
      };
    }
  }

  // Convert Yjs arrays to plain JavaScript objects for simple protocol
  convertYjsToPlain() {
    if (!useYjs || !yTasks) {
      return {
        tasks: this.getInitialTasks(),
        concepts: this.getInitialConcepts(),
        logs: this.getInitialLogs()
      };
    }

    return {
      tasks: yTasks.toArray().map(yTask => {
        if (yTask instanceof Y.Map) {
          const obj = {};
          yTask.forEach((value, key) => {
            obj[key] = value;
          });
          return obj;
        }
        return yTask;
      }),
      concepts: yConcepts.toArray().map(yConcept => {
        if (yConcept instanceof Y.Map) {
          const obj = {};
          yConcept.forEach((value, key) => {
            obj[key] = value;
          });
          return obj;
        }
        return yConcept;
      }),
      logs: yLogs.toArray().map(yLog => {
        if (yLog instanceof Y.Map) {
          const obj = {};
          yLog.forEach((value, key) => {
            obj[key] = value;
          });
          return obj;
        }
        return yLog;
      })
    };
  }

  // Broadcast state to all connected clients
  broadcastState() {
    const state = this.getCurrentState();

    // Get stats based on whether we're using Yjs or simple protocol
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
      payload: {
        ...state,
        stats
      }
    };

    const messageStr = JSON.stringify(message);

    // Broadcast to all clients
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN = 1
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
    console.log('Loading initial data...');
    console.log('Initial data loaded.');
  }

  startMockData() {
    this.mockDataInterval = setInterval(() => {
      // Broadcast current state periodically
      this.broadcastState();
    }, 5000);
  }

  async handleControlCommand(command, payload, isSimpleProtocol = false, ws = null) {
    console.log(`Received command: ${command}`, payload);
    
    try {
      switch (command) {
        case 'start':
          console.log('Start command received');
          if (useYjs && awareness) {
            // Update the reasoner state to running
            const startState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...startState,
              isRunning: true,
              isPaused: false,
              timestamp: Date.now()
            });
          }

          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastState();
          }
          break;
        case 'stop':
          console.log('Stop command received');
          if (useYjs && awareness) {
            // Update the reasoner state to stopped/paused
            const stopState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...stopState,
              isRunning: false,
              isPaused: true,
              timestamp: Date.now()
            });
          }

          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastState();
          }
          break;
        case 'step':
          console.log('Step command received - executing single cognitive cycle');
          // Run a single cognitive cycle manually
          const context = new CycleContext(Date.now());
          runSingleCycle(memory, reasoner, selector, context);

          // Sync new tasks from memory to clients
          this.syncMemoryToClients();

          if (useYjs && awareness) {
            // Update awareness with new cycle count and maintain other stats
            const currentState = awareness.getLocalState()?.reasonerStats || {};
            const newCycleCount = (currentState.cycles || 0) + 1;
            awareness.setLocalStateField('reasonerStats', {
              ...currentState,
              cycles: newCycleCount,
              isRunning: false,  // After step execution, remain paused
              isPaused: true,    // Step executed in isolation
              concepts: yConcepts.length,
              tasks: yTasks.length,
              timestamp: Date.now()
            });
          }

          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastState();
          }

          console.log('Cognitive cycle completed');
          break;
        case 'reset':
          console.log('Reset command received');
          // Reset memory and reload initial tasks
          memory = new Memory();
          reasoner = new Reasoner();
          selector = new FocusSetSelector();

          // Reload initial tasks into memory
          this.loadInitialTasksToMemory();

          if (useYjs && awareness) {
            // Reset the system to initial state
            awareness.setLocalStateField('reasonerStats', {
              isRunning: false,
              isPaused: true,
              cycles: 0,
              concepts: 3, // Updated to match our initial concepts
              tasks: 2,    // Updated to match our initial tasks
              timestamp: Date.now()
            });

            // Clear all dynamic tasks and concepts, keeping initial ones in the mock version
            yTasks.delete(0, yTasks.length);
            yConcepts.delete(0, yConcepts.length);

            // Reinitialize with hardcoded initial data
            const resetTasksData = [
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

            resetTasksData.forEach(task => {
              const taskMap = new Y.Map();
              Object.entries(task).forEach(([key, value]) => {
                taskMap.set(key, value);
              });
              yTasks.push([taskMap]);
            });

            // Also reset initial concepts
            const resetConceptsData = [
              { id: 'concept-a', content: 'a', priority: 0.9 },
              { id: 'concept-b', content: 'b', priority: 0.8 },
              { id: 'concept-c', content: 'c', priority: 0.7 }
            ];

            resetConceptsData.forEach(concept => {
              const conceptMap = new Y.Map();
              Object.entries(concept).forEach(([key, value]) => {
                conceptMap.set(key, value);
              });
              yConcepts.push([conceptMap]);
            });
          }

          // Broadcast updated state
          this.broadcastState();
          break;
        case 'throttle':
          console.log(`Throttle command: ${payload.value}%`);
          // In a real implementation, this would adjust the reasoning cycle speed
          if (useYjs && awareness) {
            const throttleState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...throttleState,
              timestamp: Date.now()
            });
          }

          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastState();
          }
          break;
        case 'add_task':
          console.log('Add task command received');
          // Validate required fields
          if (!payload.content) {
            console.error('Add task command failed: missing content');
            return;
          }

          // Create a new task and add it to memory
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

          // Add to memory (this will also trigger reasoning)
          try {
            // Parse the content to create a proper Term
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

            const task = new Task(
              term,
              '.',
              truth,
              newTaskData.createdAt,
              newTaskData.createdAt,
              newTaskData.priority
            );
            task.id = newTaskData.id;

            memory.addTask(task, Date.now());

            // Sync to clients
            this.syncMemoryToClients();

            if (useYjs && awareness) {
              // Update stats
              const addTaskState = awareness.getLocalState()?.reasonerStats || {};
              awareness.setLocalStateField('reasonerStats', {
                ...addTaskState,
                tasks: yTasks.length,
                timestamp: Date.now()
              });
            }
          } catch (error) {
            console.error('Error adding task to memory:', error);
          }
          break;
        case 'update_task':
          console.log('Update task command received');
          // Update an existing task in memory
          const updateTaskId = payload.id;
          if (!updateTaskId) {
            console.error('Update task command failed: missing task ID');
            return;
          }

          // Find and update the task in memory
          const taskToUpdate = memory.getTask(updateTaskId);
          if (taskToUpdate) {
            // Update allowed fields
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

            // Update access time
            if (taskToUpdate.setAccessedAt) {
              taskToUpdate.setAccessedAt(Date.now());
            }

            // Sync to clients
            this.syncMemoryToClients();

            if (useYjs && awareness) {
              // Update stats
              const updateTaskState = awareness.getLocalState()?.reasonerStats || {};
              awareness.setLocalStateField('reasonerStats', {
                ...updateTaskState,
                timestamp: Date.now()
              });
            }
          } else {
            console.error(`Update task command failed: task with ID ${updateTaskId} not found`);
          }
          break;
        case 'delete_task':
          console.log('Delete task command received');
          // Remove a task from memory
          const removeTaskId = payload.id;
          if (!removeTaskId) {
            console.error('Delete task command failed: missing task ID');
            return;
          }

          // Remove from memory
          const removed = memory.removeTask(removeTaskId);
          if (removed) {
            // Sync to clients
            this.syncMemoryToClients();

            if (useYjs && awareness) {
              // Update stats
              const deleteTaskState = awareness.getLocalState()?.reasonerStats || {};
              awareness.setLocalStateField('reasonerStats', {
                ...deleteTaskState,
                tasks: yTasks.length,
                timestamp: Date.now()
              });
            }
          } else {
            console.error(`Delete task command failed: task with ID ${removeTaskId} not found`);
          }
          break;
        case 'get_concepts':
          console.log('Get concepts command received');
          // Get top concepts from memory and send them back
          if (memory && memory.getTopConcepts) {
            const topConcepts = memory.getTopConcepts(20); // Get top 20 concepts

            // Convert concepts to the format expected by the UI
            const conceptsData = topConcepts.map((item, index) => ({
              id: item.id || `concept-${index}`,
              content: item.term?.name || item.concept?.term?.name || `Concept-${index}`,
              priority: item.priority || 0.5,
              name: item.term?.name || item.concept?.term?.name || `Concept-${index}`,
              type: 'concept',
              taskCount: item.taskCount || 0,
              createdAt: item.createdAt || Date.now()
            }));

            // Send concepts back to the requesting client
            if (isSimpleProtocol && ws) {
              const response = {
                type: 'concepts_update',
                payload: conceptsData
              };
              ws.send(JSON.stringify(response));
            }
          } else {
            console.warn('Memory not initialized or getTopConcepts method not available');
          }
          break;
        case 'get_top_tasks':
          console.log('Get top tasks command received');
          // Get top tasks from memory and send them back
          if (memory && memory.getTopTasks) {
            const topTasks = memory.getTopTasks(20); // Get top 20 tasks

            // Convert tasks to the format expected by the UI
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

            // Send tasks back to the requesting client
            if (isSimpleProtocol && ws) {
              const response = {
                type: 'top_tasks_update',
                payload: tasksData
              };
              ws.send(JSON.stringify(response));
            }
          } else {
            console.warn('Memory not initialized or getTopTasks method not available');
          }
          break;

        default:
          console.log(`Unknown command: ${command}`);
          // Send an error response for unknown commands
          break;
      }
    } catch (error) {
      console.error(`Error handling command ${command}:`, error);
      // In a real implementation, we might want to send an error response back to the client
    }
  }

  start() {
    this.loadInitialData();

    // Set up Yjs observers if Yjs is enabled
    if (useYjs && yTasks && awareness) {
      yTasks.observe(() => {
        this.broadcastState();
      });

      yConcepts.observe(() => {
        this.broadcastState();
      });

      yLogs.observe(() => {
        this.broadcastState();
      });

      awareness.on('change', () => {
        this.broadcastState();
      });

      console.log('📋 Yjs observers set up for automatic state broadcasting');
    }

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`SeNARS server listening on port ${this.port} (0.0.0.0)`);
        if (useYjs) {
          console.log('🔗 Yjs CRDT support enabled - both protocols supported');
        } else {
          console.log('📡 Simple WebSocket protocol only');
        }
        resolve();
      });

      this.httpServer.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws, req) => {
        // Check if this is a simple protocol client
        const fullUrl = req.url || '';
        const queryString = fullUrl.split('?')[1] || '';
        const urlParams = new URLSearchParams(queryString);
        const isSimpleProtocol = fullUrl.includes('simple') || urlParams.get('protocol') === 'simple' || req.headers['x-protocol'] === 'simple';

        if (isSimpleProtocol || !useYjs) {
          // Simple protocol client - no Yjs synchronization, just message passing
          clients.add(ws);
          simpleClients.add(ws);
          console.log('New simple protocol client connected');

          // Send initial state to the new client
          const state = this.getCurrentState();
          const stats = useYjs && awareness ? awareness.getLocalState()?.reasonerStats || {
            isRunning: false,
            isPaused: true,
            cycles: 0,
            tasks: yTasks.length,
            concepts: yConcepts.length,
            timestamp: Date.now()
          } : {
            isRunning: false,
            isPaused: true,
            cycles: 0,
            tasks: state.tasks.length,
            concepts: state.concepts.length,
            timestamp: Date.now()
          };

          const message = {
            type: 'state_update',
            payload: {
              ...state,
              stats
            }
          };

          ws.send(JSON.stringify(message));

          // Handle simple protocol messages
          ws.on('message', async (data) => {
            try {
              const message = JSON.parse(data.toString());

              if (message.type === 'control' && message.command) {
                await this.handleControlCommand(message.command, message.payload || {}, true, ws);
              } else if (message.type === 'command') {
                const command = message.payload?.data;
                if (command) {
                  await this.handleControlCommand(command, {}, true, ws);
                }
              }
            } catch (error) {
              console.error('Error handling simple protocol message:', error);
            }
          });

          // Remove client on close
          ws.on('close', () => {
            console.log('Simple protocol client disconnected');
            clients.delete(ws);
            simpleClients.delete(ws);
          });

          ws.on('error', (error) => {
            console.error('WebSocket simple protocol error:', error);
            clients.delete(ws);
            simpleClients.delete(ws);
          });
        } else if (useYjs) {
          // Yjs/CRDT protocol client - use setupWSConnection for synchronization
          clients.add(ws);
          yClients.add(ws);
          setupWSConnection(ws, req, { doc, awareness });
          console.log('New Yjs/CRDT protocol client connected and attached to Y.Doc with awareness');

          // Handle messages for command control for Yjs clients too
          ws.on('message', async (data) => {
            try {
              const message = JSON.parse(data.toString());

              if (message.type === 'control' && message.command) {
                await this.handleControlCommand(message.command, message.payload || {}, false, ws);
              } else if (message.type === 'command') {
                const command = message.payload?.data;
                if (command) {
                  await this.handleControlCommand(command, {}, false, ws);
                }
              }
            } catch (error) {
              console.error('Error handling message:', error);
            }
          });

          // Remove client on close
          ws.on('close', () => {
            console.log('Yjs/CRDT protocol client disconnected');
            clients.delete(ws);
            yClients.delete(ws);
          });

          ws.on('error', (error) => {
            console.error('WebSocket Yjs/CRDT protocol error:', error);
            clients.delete(ws);
            yClients.delete(ws);
          });
        }
      });

      this.startMockData();
      this.startReasoningCycle();
    });
  }

  stop() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    if (reasoningInterval) {
      clearInterval(reasoningInterval);
    }

    // Close all client connections
    clients.forEach(client => {
      try {
        client.close();
      } catch (e) {
        console.error('Error closing client:', e);
      }
    });
    clients.clear();

    // Clear protocol-specific client sets
    simpleClients.clear();
    if (useYjs) {
      yClients.clear();
    }

    return new Promise((resolve) => {
      this.httpServer.close(() => {
        console.log('SeNARS server closed');
        resolve();
      });
    });
  }
}

async function main() {
  const port = process.argv[2] ? parseInt(process.argv[2]) : 8080;
  const server = new SenarsServer(port);

  try {
    await server.start();
    console.log(`Server initialized on port ${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log('Received shutdown signal, shutting down gracefully');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default SenarsServer;
