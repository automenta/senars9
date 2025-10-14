#!/usr/bin/env node

/**
 * @file: examples/neurosymbolic_demo.js
 * @description: Runnable example showcasing SeNARS's neurosymbolic integration capabilities
 * This is a full-screen console TUI demonstrating the collaboration between 
 * neural (LM) and symbolic (NARS) components.
 */

import { NAR } from '../core/NAR.js';  // The main Non-Axiomatic Reasoner
import blessed from 'blessed';

// Default configuration
const DEFAULT_INPUT = "Ensure Earth Happiness!";

// Global state
let nar = null;  // The main NAR instance
let isRunning = false;
let taskSortMode = 'priority'; // priority, creationTime
let taskUpdateInterval = null;

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
 * Initialize the SeNARS NAR (Non-Axiomatic Reasoner)
 */
function initializeNAR() {
  console.log('🚀 Initializing SeNARS NAR (Non-Axiomatic Reasoner)...');
  
  try {
    // Create the NAR instance with integrated memory and reasoning
    nar = new NAR({
      cycleInterval: 1000  // Update every 1 second for demo purposes
    });
    
    console.log('✅ NAR initialized with integrated memory and reasoning');
    return nar;
  } catch (error) {
    console.error('❌ Failed to initialize NAR:', error);
    throw error;
  }
}

/**
 * Add initial input tasks to the NAR
 */
function addInitialTasks(nar, inputText) {
  console.log(`📥 Adding initial input: "${inputText}"`);
  
  try {
    // Parse and add the input as a task
    const task = nar.input({
      term: inputText,
      punctuation: '!', // Goal
      truth: { frequency: 0.9, confidence: 0.9 }
    });
    console.log('✅ Initial tasks added to NAR');
    return task;
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
 * Get tasks from the NAR and format them for display
 */
function getFormattedTasks() {
  if (!nar) {
    return [];
  }

  try {
    // Get tasks based on the selected sort mode
    let allTasks = [];
    if (taskSortMode === 'priority') {
      allTasks = nar.getTasksByPriority();
    } else if (taskSortMode === 'creationTime') {
      allTasks = nar.getTasksByTime();
    } else {
      allTasks = nar.getTasks(); // default
    }

    // Format tasks for display
    return allTasks.map(task => {
      let color = COLORS.task.belief;
      let emoji = '💭';
      
      const punctuation = task.punctuation || (task.term && task.term.punctuation) || '.';
      if (punctuation === '!') {
        color = COLORS.task.goal;
        emoji = '🎯';
      } else if (punctuation === '?') {
        color = COLORS.task.question;
        emoji = '❓';
      }
      
      const priority = (typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)).toFixed(2);
      const createdAt = new Date(task.createdAt || task._accessedAt || Date.now()).toLocaleTimeString();
      
      // Get string representation
      let taskStr = 'Unknown task';
      if (typeof task.toString === 'function') {
        taskStr = task.toString();
      } else if (task.term) {
        taskStr = typeof task.term === 'string' ? task.term : (typeof task.term.toString === 'function' ? task.term.toString() : JSON.stringify(task.term));
      }
      
      return {
        content: `{${color}-fg}${emoji} ${taskStr} (Pri: ${priority}, Created: ${createdAt}){/}`,
        priority: typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0)
      };
    });
  } catch (error) {
    console.error('Error getting formatted tasks:', error);
    return [];
  }
}

/**
 * Main function to set up the demo
 */

/**
 * Main function to set up the demo
 */
async function runDemo(inputText = DEFAULT_INPUT) {
  try {
    // Initialize the NAR
    initializeNAR();
    
    // Add initial tasks
    addInitialTasks(nar, inputText);
    
    // Create the TUI
    const { screen, taskBox, logBox, status } = createTUI();
    
    // Update tasks periodically
    taskUpdateInterval = setInterval(() => {
      try {
        const formattedTasks = getFormattedTasks();
        let taskContent = '';
        
        if (formattedTasks.length === 0) {
          taskContent = '{white-fg}No tasks in NAR memory{/}';
        } else {
          taskContent = formattedTasks.map(t => t.content).join('\n');
        }
        
        // Add spacing
        taskContent = '\n' + taskContent + '\n';
        taskBox.setContent(taskContent);
        screen.render();
      } catch (error) {
        console.error('Error updating tasks:', error);
      }
    }, 1000); // Update every second
    
    // Set up event listeners to log NAR events
    // For this demo, we'll just log to the console and the UI log
    console.log(`📥 Input received: "${inputText}"`);
    logBox.pushLine(`📥 Input received: "${inputText}"`);
    logBox.pushLine('🎯 Ready to start reasoning. Press R to run.');
    screen.render();
    
    // Start the NAR in paused mode by default
    // We won't start the continuous cycle automatically to prevent conflicts
    // Instead, we'll start/stop based on user commands
    
    // Log some initial messages
    logBox.pushLine('✅ NAR initialized with integrated memory and reasoning');
    screen.render();
    
    // Handle key events for run/pause
    let narCycleInterval = null;
    
    // Update the key handlers to use NAR
    screen.key(['r', 'R'], () => {
      if (nar) {
        isRunning = true;
        status.setContent('{center}▶️ RUNNING | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
        screen.render();
        
        // Start the NAR cycle
        nar.start();
      }
    });

    screen.key(['p', 'P'], () => {
      isRunning = false;
      status.setContent('{center}⏸️ PAUSED | [R] Run [P] Pause [S] Sort [Q] Quit{/center}');
      screen.render();
      
      // Stop the NAR cycle
      nar.stop();
    });
    
    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(taskUpdateInterval);
      if (nar) {
        nar.stop();
      }
      process.exit(0);
    });
    
    // Catch uncaught exceptions
    process.on('uncaughtException', (err) => {
      clearInterval(taskUpdateInterval);
      if (nar) {
        nar.stop();
      }
      console.error('Uncaught Exception:', err);
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
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      options.input = args[i + 1];
      i++; // Skip next argument
    }
  }
  
  return options;
}

// Run the demo with command line arguments
const options = parseArguments();
runDemo(options.input).catch(console.error);