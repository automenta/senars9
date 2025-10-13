import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { setupWSConnection } from '@y/websocket-server/utils';
import { Memory } from './Memory.js';
import { Reasoner } from './Reasoner.js';
import { FocusSetSelector } from './FocusSetSelector.js';
import { runSingleCycle, CycleContext } from './Cycle.js';
import { Task, TruthValue } from './Task.js';
import { Term, TermType } from './Term.js';


const doc = new Y.Doc();
const yTasks = doc.getArray('tasks');
const yConcepts = doc.getArray('concepts');
const yLogs = doc.getArray('logs');

// Initialize awareness for sharing real-time stats
const awareness = new Awareness(doc);

// Simple message protocol support
const simpleClients = new Set();

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

  // Synchronize tasks from memory to Yjs arrays
  syncMemoryToYjs() {
    try {
      // Get all tasks from memory
      const allMemoryTasks = memory?.getAllTasks ? memory.getAllTasks() : [];
      
      if (!Array.isArray(allMemoryTasks) || allMemoryTasks.length === 0) {
        return; // No tasks to sync
      }
      
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
      for (const task of allMemoryTasks) {
        if (!task) continue;
        
        // Create an ID for the task if it doesn't have one
        const taskId = task.id || `task_${task.createdAt || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Only add if not already in Yjs
        if (!yTaskIds.has(taskId)) {
          try {
            // Convert task to the format expected by UI
            const taskObj = {
              id: taskId,
              content: task.toString ? task.toString() : (task.content || 'Unknown Task'), // Use the string representation from Task class
              priority: task.getPriority ? task.getPriority() : (task.priority || 0.5),
              status: task.status || 'Derived', // Default to Derived if not specified
              type: task.isBelief ? (task.isBelief() ? 'Belief' : task.isGoal() ? 'Goal' : 'Question') : (task.type || 'Derived'),
              createdAt: task.createdAt || Date.now(),
              lastModified: task.getAccessedAt ? task.getAccessedAt() : Date.now(),
              // Include other relevant fields if available
              punctuation: task.punctuation || (task.content?.endsWith('!') ? '!' : task.content?.endsWith('?') ? '?' : '.'),
              truth: task.truth || null,
              occurrenceTime: task.occurrenceTime || Date.now(),
              derivationPath: task.derivationPath || []
            };
            
            const taskMap = new Y.Map();
            Object.entries(taskObj).forEach(([key, value]) => {
              taskMap.set(key, value);
            });
            yTasks.push([taskMap]);
            
            console.log(`Added derived task to Yjs: ${taskObj.content}`);
          } catch (taskError) {
            console.error('Error converting task for Yjs sync:', taskError, task);
          }
        }
      }
    } catch (error) {
      console.error('Error in syncMemoryToYjs:', error);
    }
  }

  // Enhanced: Start the reasoning cycle that will generate derived tasks
  startReasoningCycle() {
    // Initialize reasoning components
    memory = new Memory();
    reasoner = new Reasoner();
    selector = new FocusSetSelector();
    
    // Register reasoning rules that can derive new tasks
    // Import and register the DeductiveSyllogism rule for transitive inference
    import('./reasoning/SyllogisticRules.js').then(({ DeductiveSyllogism, Induction, Abduction }) => {
      reasoner.addRule(new DeductiveSyllogism());  // For deriving (a-->c) from (a-->b) and (b-->c)
      reasoner.addRule(new Induction());          // For other types of inference
      reasoner.addRule(new Abduction());          // For other types of inference
      console.log('✅ Reasoning rules registered for task derivation');
    }).catch(err => {
      console.error('Failed to import reasoning rules:', err);
    });
    
    // Load initial tasks from Yjs arrays into memory so they can be reasoned about
    this.loadYjsToMemory();
    
    // Set up interval for running reasoning cycles
    reasoningInterval = setInterval(() => {
      // Run a single cognitive cycle
      const context = new CycleContext(Date.now());
      runSingleCycle(memory, reasoner, selector, context);
      
      // Sync new tasks from memory to Yjs arrays
      this.syncMemoryToYjs();
    }, 1000); // Run cycle every second
  }
  
  // Load tasks from Yjs arrays into memory so they can be processed by the reasoning system
  loadYjsToMemory() {
    try {
      // Load tasks from Yjs into memory
      yTasks.forEach(yTask => {
        if (yTask instanceof Y.Map) {
          const taskData = {};
          yTask.forEach((value, key) => {
            taskData[key] = value;
          });
          
          if (!taskData.content) {
            console.warn('Task missing content, skipping:', taskData);
            return;
          }
          
          try {
            // Create a simple Term - use the content to generate appropriate term structure
            // For the basic case like "(a-->b).", parse the subject and predicate if possible
            let term;
            let truth = taskData.truth || null;
            const content = taskData.content.replace(/[.!?:]+$/, '').trim(); // Remove ending punctuation
            
            // Try to parse simple implication format like "(a-->b)"
            const impMatch = content.match(/\(([^(]+)-->([^)]+)\)/);
            if (impMatch) {
              // This looks like an implication "subject --> predicate"
              const subject = impMatch[1].trim();
              const predicate = impMatch[2].trim();
              
              const subjTerm = Term.newAtom(subject);
              const predTerm = Term.newAtom(predicate);
              term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]); // Using inheritance for implication
              
              // Create a default TruthValue object if not provided
              if (!truth) {
                truth = new TruthValue(0.8, 0.8); // Reasonable default values with proper TruthValue object
              } else if (typeof truth === 'object' && !truth.hasOwnProperty('frequency')) {
                // If it's an object but not a TruthValue instance, create one
                truth = new TruthValue(truth.frequency || 0.8, truth.confidence || 0.8);
              }
            } else {
              // Default to simple atom
              term = Term.newAtom(content);
              
              // For non-inheritance terms, create default truth
              if (!truth) {
                truth = new TruthValue(0.5, 0.5);
              } else if (typeof truth === 'object' && !truth.hasOwnProperty('frequency')) {
                truth = new TruthValue(truth.frequency || 0.5, truth.confidence || 0.5);
              }
            }
            
            // Create Task object with proper punctuation from the content
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
              truth, // Use the truth value we created
              taskData.createdAt || Date.now(),
              taskData.occurrenceTime || Date.now(),
              taskData.priority || 0.5
            );
            
            // Add any additional properties
            task.id = taskData.id;
            
            // Add to memory
            memory.addTask(task, Date.now());
            console.log(`Loaded task into memory: ${taskData.content} [type: ${term.termType}, subject: ${term.subject?.name || 'none'}, predicate: ${term.predicate?.name || 'none'}]`);
          } catch (taskError) {
            console.error('Error creating task from Yjs data:', taskError, taskData);
          }
        }
      });
    } catch (error) {
      console.error('Error in loadYjsToMemory:', error);
    }
  }

  // Convert Yjs arrays to plain JavaScript objects for simple protocol
  convertYjsToPlain() {
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

  // Broadcast state to all simple protocol clients
  broadcastSimpleState() {
    const state = this.convertYjsToPlain();
    const stats = awareness.getLocalState()?.reasonerStats || {
      isRunning: false,
      isPaused: true,
      cycles: 0,
      tasks: yTasks.length,
      concepts: yConcepts.length,
      timestamp: Date.now()
    };

    // Update stats with current counts
    stats.tasks = yTasks.length;
    stats.concepts = yConcepts.length;

    const message = {
      type: 'state_update',
      payload: {
        ...state,
        stats
      }
    };

    const messageStr = JSON.stringify(message);
    simpleClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN = 1
        client.send(messageStr);
      }
    });
  }

  loadInitialData() {
    console.log('Loading initial data into Y.Doc...');
    
    // Load specific initial tasks as requested
    const initialTasksData = [
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
    
    console.log('Adding', initialTasksData.length, 'initial tasks to Yjs document');
    initialTasksData.forEach(task => {
      const taskMap = new Y.Map();
      Object.entries(task).forEach(([key, value]) => {
        taskMap.set(key, value);
      });
      yTasks.push([taskMap]);
    });
    
    // Also load some initial concepts
    const initialConceptsData = [
      { id: 'concept-a', content: 'a', priority: 0.9 },
      { id: 'concept-b', content: 'b', priority: 0.8 },
      { id: 'concept-c', content: 'c', priority: 0.7 }
    ];
    
    console.log('Adding', initialConceptsData.length, 'initial concepts to Yjs document');
    initialConceptsData.forEach(concept => {
      const conceptMap = new Y.Map();
      Object.entries(concept).forEach(([key, value]) => {
        conceptMap.set(key, value);
      });
      yConcepts.push([conceptMap]);
    });
    
    // Load some initial logs
    const initialLogsData = [
      { id: 'log-1', message: 'System initialized', timestamp: Date.now() },
      { id: 'log-2', message: 'Initial tasks loaded: (a-->b)., (b-->c).', timestamp: Date.now() }
    ];
    
    console.log('Adding', initialLogsData.length, 'initial logs to Yjs document');
    initialLogsData.forEach(log => {
      const logMap = new Y.Map();
      Object.entries(log).forEach(([key, value]) => {
        logMap.set(key, value);
      });
      yLogs.push([logMap]);
    });
    
    // Verify the data was added
    console.log('Yjs tasks array size after loading:', yTasks.length);
    console.log('Yjs concepts array size after loading:', yConcepts.length);
    console.log('Yjs logs array size after loading:', yLogs.length);
    
    // Log first task if it exists
    if (yTasks.length > 0) {
      const firstTask = yTasks.get(0);
      if (firstTask && firstTask instanceof Y.Map) {
        console.log('First task content:', firstTask.get('content'));
      }
    }
    
    console.log('Initial data loaded.');
  }

  startMockData() {
    // Set initial awareness state with cycle stats
    awareness.setLocalStateField('reasonerStats', {
      isRunning: false,
      isPaused: true,  // Start paused by default
      cycles: 0,
      tasks: 2,  // Updated to match our initial tasks
      concepts: 3, // Updated to match our initial concepts
      timestamp: Date.now()
    });

    this.mockDataInterval = setInterval(() => {
      const concept = { type: 'concept', data: { id: randomUUID(), content: `Dynamic Concept ${Date.now()}` } };
      yConcepts.push([new Y.Map(Object.entries(concept))]);

      // Update awareness with current stats
      const currentState = awareness.getLocalState()?.reasonerStats || {};
      awareness.setLocalStateField('reasonerStats', {
        ...currentState,
        isRunning: false,  // Default to not running
        isPaused: true,    // Default to paused
        concepts: yConcepts.length,
        tasks: yTasks.length,
        timestamp: Date.now()
      });
    }, 5000);
  }

  async handleControlCommand(command, payload, isSimpleProtocol = false) {
    console.log(`Received command: ${command}`, payload);
    
    try {
      switch (command) {
        case 'start':
          console.log('Start command received');
          // Update the reasoner state to running
          const startState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...startState,
            isRunning: true,
            isPaused: false,
            timestamp: Date.now()
          });
          
          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastSimpleState();
          }
          break;
        case 'stop':
          console.log('Stop command received');
          // Update the reasoner state to stopped/paused
          const stopState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...stopState,
            isRunning: false,
            isPaused: true,
            timestamp: Date.now()
          });
          
          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastSimpleState();
          }
          break;
        case 'step':
          console.log('Step command received - executing single cognitive cycle');
          // Simulate a cognitive step by updating the cycle count and maintaining current state
          const currentState = awareness.getLocalState()?.reasonerStats || {};
          const newCycleCount = (currentState.cycles || 0) + 1;
          
          // Update awareness with new cycle count and maintain other stats
          awareness.setLocalStateField('reasonerStats', {
            ...currentState,
            cycles: newCycleCount,
            isRunning: false,  // After step execution, remain paused
            isPaused: true,    // Step executed in isolation
            concepts: yConcepts.length,
            tasks: yTasks.length,
            timestamp: Date.now()
          });
          
          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastSimpleState();
          }
          
          console.log(`Cognitive cycle ${newCycleCount} completed`);
          break;
        case 'reset':
          console.log('Reset command received');
          // Reset the system to initial state
          const resetState = awareness.getLocalState()?.reasonerStats || {};
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
          
          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastSimpleState();
          }
          break;
        case 'throttle':
          console.log(`Throttle command: ${payload.value}%`);
          // In a real implementation, this would adjust the reasoning cycle speed
          const throttleState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...throttleState,
            timestamp: Date.now()
          });
          
          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastSimpleState();
          }
          break;
        case 'add_task':
          console.log('Add task command received');
          // Validate required fields
          if (!payload.content) {
            console.error('Add task command failed: missing content');
            return;
          }
          
          // Add a new task to the Yjs document
          const newTask = {
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
          
          const taskMap = new Y.Map();
          Object.entries(newTask).forEach(([key, value]) => {
            taskMap.set(key, value);
          });
          yTasks.push([taskMap]);
          
          // Update stats
          const addTaskState = awareness.getLocalState()?.reasonerStats || {};
          awareness.setLocalStateField('reasonerStats', {
            ...addTaskState,
            tasks: yTasks.length,
            timestamp: Date.now()
          });
          
          // For simple protocol, we need to broadcast the updated state
          if (isSimpleProtocol) {
            this.broadcastSimpleState();
          }
          break;
        case 'update_task':
          console.log('Update task command received');
          // Update an existing task
          const taskId = payload.id;
          if (!taskId) {
            console.error('Update task command failed: missing task ID');
            return;
          }
          
          const yTasksArr = doc.getArray('tasks');
          const taskIndex = yTasksArr.toArray().findIndex(task => task.get('id') === taskId);
          if (taskIndex !== -1) {
            const taskMap = yTasksArr.get(taskIndex);
            // Ensure ID can't be changed and sanitize the update
            const allowedFields = ['priority', 'status', 'type', 'content', 'dependencies', 'missionId', 'metadata'];
            const updatedFields = { lastModified: Date.now() };
            
            for (const [key, value] of Object.entries(payload)) {
              if (allowedFields.includes(key) && key !== 'id') {
                updatedFields[key] = value;
              }
            }
            
            for (const [key, value] of Object.entries(updatedFields)) {
              taskMap.set(key, value);
            }
            
            // Update stats
            const updateTaskState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...updateTaskState,
              timestamp: Date.now()
            });
            
            // For simple protocol, we need to broadcast the updated state
            if (isSimpleProtocol) {
              this.broadcastSimpleState();
            }
          } else {
            console.error(`Update task command failed: task with ID ${taskId} not found`);
          }
          break;
        case 'delete_task':
          console.log('Delete task command received');
          // Remove a task from the Yjs document
          const deleteTaskId = payload.id;
          if (!deleteTaskId) {
            console.error('Delete task command failed: missing task ID');
            return;
          }
          
          const yTasksArr2 = doc.getArray('tasks');
          const deleteIndex = yTasksArr2.toArray().findIndex(task => task.get('id') === deleteTaskId);
          if (deleteIndex !== -1) {
            yTasksArr2.delete(deleteIndex, 1);
            
            // Update stats
            const deleteTaskState = awareness.getLocalState()?.reasonerStats || {};
            awareness.setLocalStateField('reasonerStats', {
              ...deleteTaskState,
              tasks: yTasksArr2.length,
              timestamp: Date.now()
            });
            
            // For simple protocol, we need to broadcast the updated state
            if (isSimpleProtocol) {
              this.broadcastSimpleState();
            }
          } else {
            console.error(`Delete task command failed: task with ID ${deleteTaskId} not found`);
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

    // Set up Yjs observers to automatically broadcast changes to simple protocol clients
    yTasks.observe(() => {
      this.broadcastSimpleState();
    });
    
    yConcepts.observe(() => {
      this.broadcastSimpleState();
    });
    
    yLogs.observe(() => {
      this.broadcastSimpleState();
    });
    
    // Also observe awareness changes for stats updates
    awareness.on('change', () => {
      this.broadcastSimpleState();
    });

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        console.log(`SeNARS server listening on port ${this.port} (0.0.0.0)`);
        resolve();
      });

      this.httpServer.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });

      this.wss.on('connection', (ws, req) => {
        // Check if this is a simple protocol client by looking at the connection parameters or path
        // If it's a simple protocol client, add it to the simple clients set and handle messages differently
        // req.url includes the path and query string, e.g., "/?protocol=simple" or "?protocol=simple"
        const fullUrl = req.url || '';
        const queryString = fullUrl.split('?')[1] || '';
        const urlParams = new URLSearchParams(queryString);
        const isSimpleProtocol = fullUrl.includes('simple') || urlParams.get('protocol') === 'simple' || req.headers['x-protocol'] === 'simple';

        if (isSimpleProtocol) {
          // Simple protocol client - no Yjs synchronization, just message passing
          simpleClients.add(ws);
          console.log('New simple protocol client connected');
          
          // Send initial state to the new client
          const state = this.convertYjsToPlain();
          const stats = awareness.getLocalState()?.reasonerStats || {
            isRunning: false,
            isPaused: true,
            cycles: 0,
            tasks: yTasks.length,
            concepts: yConcepts.length,
            timestamp: Date.now()
          };

          // Update stats with current counts
          stats.tasks = yTasks.length;
          stats.concepts = yConcepts.length;

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
                await this.handleControlCommand(message.command, message.payload || {}, true);
              } else if (message.type === 'command') {
                // Handle legacy command format
                const command = message.payload?.data;
                if (command) {
                  await this.handleControlCommand(command, {}, true);
                }
              }
            } catch (error) {
              console.error('Error handling simple protocol message:', error);
            }
          });

          // Remove client on close
          ws.on('close', () => {
            console.log('Simple protocol client disconnected');
            simpleClients.delete(ws);
          });
          
          ws.on('error', (error) => {
            console.error('WebSocket simple protocol error:', error);
            simpleClients.delete(ws);
          });
        } else {
          // Yjs/CRDT protocol client - use setupWSConnection for synchronization
          setupWSConnection(ws, req, { doc, awareness });
          console.log('New Yjs/CRDT protocol client connected and attached to Y.Doc with awareness');

          // Handle messages for command control for Yjs clients too
          ws.on('message', async (data) => {
            try {
              const message = JSON.parse(data.toString());
              
              if (message.type === 'control' && message.command) {
                await this.handleControlCommand(message.command, message.payload || {});
              } else if (message.type === 'command') {
                // Handle legacy command format
                const command = message.payload?.data;
                if (command) {
                  await this.handleControlCommand(command, {});
                }
              }
            } catch (error) {
              console.error('Error handling message:', error);
            }
          });
        }
      });

      this.startMockData();
      
      // Start the reasoning cycle to generate derived tasks
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

    // Close all simple protocol connections
    simpleClients.forEach(client => {
      try {
        client.close();
      } catch (e) {
        console.error('Error closing simple protocol client:', e);
      }
    });
    simpleClients.clear();

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
