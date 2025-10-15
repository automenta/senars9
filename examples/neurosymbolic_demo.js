#!/usr/bin/env node

/**
 * @file: examples/neurosymbolic_demo.js
 * @description: Runnable example showcasing SeNARS's neurosymbolic integration capabilities
 * This is a full-screen console TUI demonstrating the collaboration between 
 * neural (LM) and symbolic (NARS) components.
 */

import { NAR } from '../core/NAR.js';  // The main Non-Axiomatic Reasoner
import { FocusSetSelector } from '../core/FocusSetSelector.js';
import Bag from '../core/memory/Bag.js';
import System from '../core/system/System.js';  // The main System with LM integration
import blessed from 'blessed';
import { GoalDecompositionRule } from '../core/reasoning/lm/rules/GoalDecompositionRule.js';
import { HypothesisGenerationRule } from '../core/reasoning/lm/rules/HypothesisGenerationRule.js';
import { VariableGroundingRule } from '../core/reasoning/lm/rules/VariableGroundingRule.js';
import { TaskPremise } from '../core/reasoning/Premise.js';

// Default configuration
const DEFAULT_INPUT = "Ensure Earth Happiness!";
const DEFAULT_LM_PROVIDER = "xenova";

// Global state
let system = null;  // The main System instance (with both NAR and LM)
let nar = null;     // The NAR component within the system
let isRunning = false;
let taskSortMode = 'priority'; // priority, creationTime
let taskUpdateInterval = null;
let logLines = [];
const MAX_LOG_LINES = 5000;

/**
 * Process tasks through the new unified reasoning system
 */
async function processNeurosymbolicRules() {
  if (!system || !system.core || !system.core.focus || !system.lm) return;

  try {
    // Get focus items to process
    const focusItems = system.core.focus.getFocusItems ? system.core.focus.getFocusItems() : [];
    if (focusItems.length === 0) {
      return;
    }

    // For reasoning, we use probabilistic sampling from a Bag.
    const taskBag = new Bag();
    for (const [key, taskData] of focusItems) {
      const priority = typeof taskData.getPriority === 'function' ? taskData.getPriority() : (taskData.priority || 0);
      taskBag.put(key, taskData, priority);
    }

    // Sample one task to process for this cycle to simulate the NAR's single-premise reasoning.
    const sampledTaskData = taskBag.sample();
    if (!sampledTaskData) {
      return;
    }
    const focusTask = sampledTaskData.item;
    
    // The unified reasoning system is now handled automatically by the core reasoning component
    // We can still demonstrate LM-specific processing here if needed
    
    // For demo purposes, we'll directly call the LM with the focus task
    if (focusTask.punctuation === '!') { // If it's a goal
      // Apply goal decomposition logic directly
      const rule = new GoalDecompositionRule(system.lm);
      if (rule.canApply({ tasks: [focusTask] })) {
        const result = await rule.apply({ tasks: [focusTask] });
        if (result && Array.isArray(result)) {
          for (const newTask of result) {
            try {
              await system.input(newTask);
              addLogLine(`📝 New task added: ${newTask.term || newTask}`);
            } catch (error) {
              console.error('Error adding new task:', error);
              addLogLine(`⚠️  Error adding task: ${error.message}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error processing neurosymbolic rules:', error);
    addLogLine(`⚠️  Neurosymbolic reasoning error: ${error.message}`);
  }
}

/**
 * Setup neurosymbolic integration rules using the unified reasoning system
 */
function setupNeurosymbolicRules() {
  // The unified reasoning system is already set up in the core
  // LM rules are automatically registered when the LM is available
  addLogLine("✅ Neurosymbolic rules will be handled by the unified reasoning system");
}

// Color scheme
const COLORS = {
  border: 'cyan',
  text: 'white',
  highlight: 'yellow',
  success: 'green',
  error: 'red',
  info: 'blue',
  task: {
    goal: 'magenta',
    belief: 'green',
    question: 'cyan'
  }
};

/**
 * Initialize the SeNARS System (with both NAR and LM integration)
 */
async function initializeSystem(lmProvider = DEFAULT_LM_PROVIDER) {
  console.log('🚀 Initializing SeNARS Neurosymbolic System...');
  
  try {
    // Initialize with configuration that includes LM provider
    const config = {
      components: {
        lm: {
          provider: lmProvider
        },
        webSocketServer: {
          enabled: false  // Disable WebSocket server for terminal UI
        }
      }
    };

    system = new System(config);

    await system.start();
    nar = system.core;  // Get the NAR component from the system
    
    // Set up the focus properly
    if (system.core.focus) {
      system.core.focus.setFocus('default');
      console.log('🎯 Focus set activated');
    }
    
    console.log('✅ System initialized with integrated neural and symbolic components');
    return system;
  } catch (error) {
    console.error('❌ Failed to initialize system:', error);
    throw error;
  }
}

/**
 * Add a line to the log with automatic cleanup
 */
function addLogLine(line) {
  logLines.push(line);
  if (logLines.length > MAX_LOG_LINES) {
    logLines = logLines.slice(-MAX_LOG_LINES);
  }
}

/**
 * Get formatted log content
 */
function getFormattedLog() {
  return logLines.join('\n');
}

/**
 * Add initial input tasks to the system
 */
async function addInitialTasks(system, inputText) {
  console.log(`📥 Adding initial input: "${inputText}"`);
  
  try {
    // Parse and add the input as a task
    await system.input({
      term: inputText,
      punctuation: '!', // Goal
      truth: { frequency: 0.9, confidence: 0.9 }
    });
    console.log('✅ Initial tasks added to system');
  } catch (error) {
    console.error('❌ Failed to add initial tasks:', error);
  }
}

/**
 * Create the TUI interface using blessed
 */
function createTUI() {
  // Create a screen object
  const screen = blessed.screen({
    smartCSR: true,
    title: 'SeNARS Neurosymbolic Demo',
    fullUnicode: true // Enable full Unicode support for emojis
  });

  // Hide cursor
  screen.cursor = false;

  // Create main layout containers
  const title = blessed.box({
    top: '0',
    left: '0',
    width: '100%',
    height: '3',
    content: '{center}🧠 SeNARS Neurosymbolic Integration Demo{/center}\n{center}Bridging Neural Understanding and Symbolic Reasoning{/center}',
    align: 'center',
    valign: 'middle',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.highlight,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Left column: Tasks
  const taskBox = blessed.box({
    top: '3',
    left: '0',
    width: '50%',
    height: '80%',
    content: 'Loading tasks...',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    border: {
      type: 'line'
    },
    label: '📋 Tasks (Sorted by Priority)',
    style: {
      fg: COLORS.text,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Right column: Log
  const logBox = blessed.box({
    top: '3',
    left: '50%',
    width: '50%',
    height: '80%',
    content: 'System log will appear here...\n',
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    border: {
      type: 'line'
    },
    label: '📜 Log',
    style: {
      fg: COLORS.text,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Status bar
  const status = blessed.box({
    top: '80%',
    left: '0',
    width: '100%',
    height: '5%',
    content: '{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}',
    align: 'center',
    valign: 'middle',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.info,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Info box
  const info = blessed.box({
    top: '85%',
    left: '0',
    width: '100%',
    height: '15%',
    content: `💡 Neurosymbolic Integration:
Neural (LM): Interprets natural language goals, generates hypotheses, translates between language and formal representations.
Symbolic (NARS): Validates consistency, performs logical reasoning, manages truth values, invokes LM when needed.

Example inputs: "Ensure Earth Happiness!", "Ensure User's Wealth!", etc.`,
    align: 'left',
    valign: 'top',
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      fg: COLORS.info,
      border: {
        fg: COLORS.border
      }
    }
  });

  // Add all elements to screen
  screen.append(title);
  screen.append(taskBox);
  screen.append(logBox);
  screen.append(status);
  screen.append(info);

  // Handle key events
  screen.key(['q', 'C-c'], () => {
    return process.exit(0);
  });

  screen.key(['r', 'R'], () => {
    if (system) {
      isRunning = true;
      status.setContent('{center}▶️ RUNNING | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
      screen.render();
      
      // Start the reasoning cycle via system
      if (system.core && system.core.cycle) {
        system.core.cycle.resume();
      }
    }
  });

  screen.key(['p', 'P'], () => {
    isRunning = false;
    status.setContent('{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
    screen.render();
    
    // Pause the reasoning cycle via system
    if (system.core && system.core.cycle) {
      system.core.cycle.pause();
    }
  });

  screen.key(['s', 'S'], () => {
    // Cycle through sort modes
    const modes = ['priority', 'creationTime'];
    const currentIndex = modes.indexOf(taskSortMode);
    taskSortMode = modes[(currentIndex + 1) % modes.length];
    
    let sortLabel = 'Priority';
    if (taskSortMode === 'creationTime') sortLabel = 'Creation Time';
    
    taskBox.setLabel(`📋 Tasks (Sorted by ${sortLabel})`);
    screen.render();
  });

  // Make the screen renderable
  screen.render();

  return {
    screen,
    taskBox,
    logBox,
    status
  };
}

/**
 * Get tasks from the system and format them for display
 */
function getFormattedTasks() {
  if (!system || !system.core || !system.core.focus) {
    return [];
  }

  try {
    // For the UI, we display the highest-priority items deterministically.
    const focusItems = system.core.focus.getFocusItems
      ? system.core.focus.getFocusItems(system.core.focus.focusSize || 10)
      : [];
    const focusTasks = focusItems.map(item => item[1]); // Extract task data

    // Sort tasks based on the selected mode
    let sortedTasks = [];
    if (taskSortMode === 'priority') {
      sortedTasks = focusTasks.sort((a, b) => {
        const aPriority = typeof a.getPriority === 'function' ? a.getPriority() : (a.priority || a._priority || 0);
        const bPriority = typeof b.getPriority === 'function' ? b.getPriority() : (b.priority || b._priority || 0);
        return bPriority - aPriority;  // Higher priority first
      });
    } else if (taskSortMode === 'creationTime') {
      sortedTasks = focusTasks.sort((a, b) => {
        const aTime = a.createdAt || a._accessedAt || Date.now();
        const bTime = b.createdAt || b._accessedAt || Date.now();
        return bTime - aTime;  // Newer first
      });
    } else {
      sortedTasks = focusTasks; // default - no specific sorting
    }

    // Format tasks for display
    return sortedTasks.map(task => {
      let color = COLORS.task.belief;
      let emoji = '💭';

      // Extract punctuation and term from various possible formats
      let punctuation = '.';
      let term = 'Unknown task';
      
      if (task.punctuation) {
        punctuation = task.punctuation;
      } else if (task.term && typeof task.term === 'object' && task.term.punctuation) {
        punctuation = task.term.punctuation;
      } else if (typeof task === 'string' && task.includes('!')) {
        punctuation = '!';
      } else if (typeof task === 'string' && task.includes('?')) {
        punctuation = '?';
      }
      
      // Extract term from various possible formats
      if (typeof task === 'string') {
        term = task;
      } else if (task.term) {
        term = typeof task.term === 'string' ? task.term : (typeof task.term.toString === 'function' ? task.term.toString() : JSON.stringify(task.term));
      } else if (task.toString && typeof task.toString === 'function') {
        term = task.toString();
      } else {
        term = JSON.stringify(task);
      }

      if (punctuation === '!') {
        color = COLORS.task.goal;
        emoji = '🎯';
      } else if (punctuation === '?') {
        color = COLORS.task.question;
        emoji = '❓';
      }

      const priority = (typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)).toFixed(2);
      const createdAt = new Date(task.createdAt || task._accessedAt || Date.now()).toLocaleTimeString();

      return {
        content: `{${color}-fg}${emoji} ${term} (Pri: ${priority}, Created: ${createdAt}){/}`,
        priority: typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)
      };
    });
  } catch (error) {
    console.error('Error getting formatted tasks:', error);
    console.error('Core structure:', system.core ? Object.keys(system.core) : 'No core');
    return [];
  }
}

/**
 * Main function to set up the demo
 */

/**
 * Main function to set up the demo
 */
async function runDemo(inputText = DEFAULT_INPUT, lmProvider = DEFAULT_LM_PROVIDER) {
  try {
    // Initialize the system
    await initializeSystem(lmProvider);

    // Add initial tasks
    await addInitialTasks(system, inputText);

    // Create neurosymbolic integration rules based on experimental tests
    setupNeurosymbolicRules();
    
    // Create the TUI
    const { screen, taskBox, logBox, status } = createTUI();
    
    // Update tasks periodically
    taskUpdateInterval = setInterval(async () => {
      try {
        // Process neurosymbolic integration rules periodically
        await processNeurosymbolicRules();
        // Add a periodic check to show system activity
        addLogLine('🔍 Neurosymbolic rule check cycle');
        
        // The system's core components handle reasoning automatically
        // When tasks are input and the system is running, reasoning cycles execute
        // Just let the system's built-in mechanisms handle the reasoning process
        if (system.core && system.core.messages) {
          // Emit a periodic stats event to see system activity
          const stats = system.core.getStats ? system.core.getStats() : {};
          if (stats.components && stats.components.memory) {
            const taskCount = stats.components.memory.itemCount || 
                             stats.components.memory.storageSize || 
                             (system.core.memory ? (system.core.memory.getAllTasks ? 
                               system.core.memory.getAllTasks().length : 0) : 0);
            if (taskCount > 0) {
              addLogLine(`📊 Memory contains ${taskCount} items`);
            }
          }
        }
        
        const formattedTasks = getFormattedTasks();
        let taskContent = '';
        
        if (formattedTasks.length === 0) {
          taskContent = '{white-fg}No tasks in memory{/}';
        } else {
          taskContent = formattedTasks.map(t => t.content).join('\n');
        }
        
        // Add spacing
        taskContent = '\n' + taskContent + '\n';
        taskBox.setContent(taskContent);
        
        // Update log as well
        logBox.setContent(getFormattedLog());
        screen.render();
      } catch (error) {
        console.error('Error updating tasks:', error);
      }
    }, 1000); // Update every second
    
    // Set up event listeners to log system events
    if (system) {
      // Listen to system events and add them to the log
      system.on('task.input', (task) => {
        const line = `📥 Task input: ${task.term} (${task.punctuation})`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('task.processed', (result) => {
        const line = `✅ Task processed: ${result.content || 'Unknown'}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('cycle.stats', (stats) => {
        const line = `🔄 Cycle ${stats.cycles} executed at ${new Date(stats.timestamp).toLocaleTimeString()}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('system.started', (data) => {
        const line = `🚀 System started at ${new Date(data.timestamp).toLocaleTimeString()}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('reasoning_error', (error) => {
        const line = `⚠️  Reasoning error: ${error.message || error}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });

      system.on('lm.consulted', (data) => {
        const line = `🤖 LM consulted: ${data.purpose || 'Unknown purpose'}`;
        addLogLine(line);
        logBox.setContent(getFormattedLog());
        screen.render();
      });
    }

    // Log some initial messages
    addLogLine('✅ System initialized');
    addLogLine(`📥 Input received: "${inputText}"`);
    addLogLine('🎯 Ready to start reasoning. Press R to run.');
    logBox.setContent(getFormattedLog());
    screen.render();
    
    // Start the cycle in paused mode by default
    if (system.core && system.core.cycle) {
      // Initialize the cycle but keep it paused by default
      await system.core.cycle.start(); // Start the cycle manager
      await system.core.cycle.pause(); // Set to paused initially
    }
    
    // Handle key events for run/pause
    screen.key(['r', 'R'], () => {
      if (system) {
        isRunning = true;
        status.setContent('{center}▶️ RUNNING | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
        screen.render();

        // Start the reasoning cycle via system
        if (system.core && system.core.cycle) {
          system.core.cycle.resume();
        }
      }
    });

    screen.key(['p', 'P'], () => {
      isRunning = false;
      status.setContent('{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
      screen.render();

      // Pause the reasoning cycle via system
      if (system.core && system.core.cycle) {
        system.core.cycle.pause();
      }
    });
    
    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(taskUpdateInterval);
      if (system) {
        system.stop().catch(console.error);
      }
      process.exit(0);
    });
    
    // Catch uncaught exceptions
    process.on('uncaughtException', (err) => {
      clearInterval(taskUpdateInterval);
      console.error('Uncaught Exception:', err);
      if (system) {
        system.stop().catch(console.error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to run demo:', error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    input: DEFAULT_INPUT,
    provider: DEFAULT_LM_PROVIDER
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      options.input = args[i + 1];
      i++; // Skip next argument
    } else if (args[i] === '--provider' || args[i] === '-p') {
      options.provider = args[i + 1];
      i++; // Skip next argument
    }
  }

  return options;
}

// Run the demo with command line arguments
const options = parseArguments();
runDemo(options.input, options.provider).catch(console.error);
