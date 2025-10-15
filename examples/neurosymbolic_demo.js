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

// Neurosymbolic integration rules registry
const integrationRules = [];

/**
 * Add a neurosymbolic integration rule
 * @param {Object} rule - The integration rule
 * @param {Function} rule.premiseCriteria - Function that determines if a task qualifies for this rule
 * @param {Function} rule.lmPromptTemplate - Function that generates the prompt for the LM
 * @param {Function} rule.lmOutputProcessor - Function that processes LM output
 * @param {Function} rule.taskGenerator - Function that creates new tasks from processed output
 */
function addIntegrationRule(rule) {
  integrationRules.push(rule);
}

/**
 * Process tasks through neurosymbolic integration rules
 */
async function processNeurosymbolicRules() {
  if (!system || !system.core || !system.core.focus) return;

  try {
    // For reasoning, we use probabilistic sampling from a Bag.
    const focusItems = system.core.focus.getFocusItems ? system.core.focus.getFocusItems() : [];
    if (focusItems.length === 0) {
      return;
    }

    const taskBag = new Bag();
    for (const [key, taskData] of focusItems) {
      taskBag.put(key, taskData, taskData.priority);
    }

    // Sample one task to process for this cycle to simulate the NAR's single-premise reasoning.
    const sampledTaskData = taskBag.sample();
    if (!sampledTaskData) {
      return;
    }
    const focusTasks = [sampledTaskData.item]; // Process one sampled task.
    
    // Apply each integration rule to eligible focus tasks (premises)
    for (const rule of integrationRules) {
      for (const task of focusTasks) {
        try {
          // Check if the task meets the rule's criteria
          if (rule.premiseCriteria && rule.premiseCriteria(task)) {
            // Log that we're consulting the LM
            addLogLine(`🤖 LM consulted for rule: ${rule.description || 'Neurosymbolic rule'}`);
            
            // Generate prompt for the LM
            const prompt = rule.lmPromptTemplate(task);
            
            // Consult with the LM
            const lmResponse = await system.lm.process(prompt);
            
            // Process the LM output
            const processedOutput = rule.lmOutputProcessor(lmResponse, task);
            
            // Generate new tasks based on the processed output
            if (rule.taskGenerator && processedOutput) {
              const newTasks = rule.taskGenerator(processedOutput, task);
              
              // Add new tasks to the system
              if (Array.isArray(newTasks)) {
                for (const newTask of newTasks) {
                  await system.input(newTask);
                  addLogLine(`📝 New task added: ${newTask.term || newTask}`);
                }
              } else if (newTasks) {
                await system.input(newTasks);
                addLogLine(`📝 New task added: ${newTasks.term || newTask}`);
              }
            }
          }
        } catch (error) {
          console.error('Error in neurosymbolic rule processing:', error);
          addLogLine(`⚠️  Rule processing error: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing neurosymbolic rules:', error);
  }
}

/**
 * Setup neurosymbolic integration rules based on experimental tests
 */
function setupNeurosymbolicRules() {
  // Rule 1: Goal Decomposition - When there's an abstract high-level goal,
  // use the LM to break it down into more concrete sub-goals
  addIntegrationRule({
    description: "Goal Decomposition Rule",
    premiseCriteria: (task) => {
      // Check if it's a goal task (not just abstract terms, any goal!)
      const isGoal = task.punctuation === '!';
      const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0);
      
      return isGoal && priority > 0.05; // Very low threshold to catch all goals
    },
    lmPromptTemplate: (task) => {
      // Enhanced prompt to make it more likely to get actionable results
      const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
      return `Decompose this goal into 3-5 concrete, actionable sub-goals that would help achieve it: "${termStr}". Provide them as a numbered list.`;
    },
    lmOutputProcessor: (lmResponse, originalTask) => {
      try {
        addLogLine(`🤖 LM processed goal: "${originalTask.term || originalTask}"`);
        
        // Process the LM response to extract sub-goals
        const lines = lmResponse.split('\n');
        const subGoals = [];
        
        for (const line of lines) {
          // Look for numbered items or bullet points
          const match = line.match(/\d+\.\s*(.+)/) || line.match(/[•*-]\s*(.+)/);
          if (match) {
            // Clean up the sub-goal text
            let goal = match[1].trim();
            // Remove any trailing punctuation
            goal = goal.replace(/[.:;!]$/, '');
            if (goal && goal.length > 2) { // Ensure it's meaningful
              subGoals.push(goal);
            }
          }
        }
        
        // If no structured format found, try simple extraction
        if (subGoals.length === 0) {
          // Extract any imperative sentences (starting with verbs)
          const sentences = lmResponse.split(/[.!?]+/);
          for (const sentence of sentences) {
            const trimmed = sentence.trim();
            // Look for potential action items
            if (trimmed && trimmed.length > 5 && (trimmed.toLowerCase().startsWith('create') || 
                trimmed.toLowerCase().startsWith('establish') || 
                trimmed.toLowerCase().startsWith('implement') || 
                trimmed.toLowerCase().startsWith('ensure') || 
                trimmed.toLowerCase().startsWith('improve') ||
                trimmed.toLowerCase().startsWith('develop') ||
                trimmed.toLowerCase().startsWith('increase') ||
                trimmed.toLowerCase().startsWith('reduce'))) {
              subGoals.push(trimmed);
            }
          }
        }
        
        addLogLine(`✅ Extracted ${subGoals.length} subgoals from LM response`);
        return subGoals;
      } catch (error) {
        console.error('Error processing LM response:', error);
        addLogLine(`❌ Error processing LM response: ${error.message}`);
        return [];
      }
    },
    taskGenerator: (processedOutput, originalTask) => {
      const newTasks = [];
      
      if (Array.isArray(processedOutput) && processedOutput.length > 0) {
        addLogLine(`📝 Generating ${processedOutput.length} new tasks from LM output`);
        for (const subGoal of processedOutput) {
          if (subGoal && subGoal.trim()) {
            const trimmedGoal = subGoal.trim();
            // Convert to a more formal Narsese format
            const narseseGoal = trimmedGoal.toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^\w!_]/g, '') + '!'; // Remove special characters, keep the goal mark
              
            const newTask = {
              term: narseseGoal,
              punctuation: '!',
              truth: { frequency: 0.8, confidence: 0.7 },
              parent: originalTask.term || originalTask
            };
            
            newTasks.push(newTask);
            addLogLine(`🎯 New goal task added: ${narseseGoal}`);
            
            // Also create a belief linking the sub-goal to the original goal
            if (originalTask.term) {
              const originalTerm = originalTask.term.toString ? originalTask.term.toString() : 
                                  originalTask.term.replace ? originalTask.term.replace(/[!?]/g, '') : 
                                  String(originalTask.term).replace(/[!?]/g, '');
              const termForLink = trimmedGoal.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
              const linkTerm = `(${termForLink} ==> ${originalTerm.replace(/\s+/g, '_').replace(/[^\w_]/g, '')}).`;
              
              const beliefTask = {
                term: linkTerm,
                punctuation: '.',
                truth: { frequency: 0.9, confidence: 0.8 }
              };
              
              newTasks.push(beliefTask);
              addLogLine(`🔗 Belief link added: ${linkTerm}`);
            }
          }
        }
      } else {
        // Even if no specific output, add some logging
        addLogLine(`ℹ️ No specific tasks generated from this LM response`);
      }
      
      return newTasks;
    }
  });
  
  // Rule 2: Hypothesis Generation - When there's a belief that might need 
  // more supporting evidence, use the LM to generate related hypotheses
  addIntegrationRule({
    description: "Hypothesis Generation Rule",
    premiseCriteria: (task) => {
      // Look for beliefs with low confidence that might benefit from additional hypotheses
      const isBelief = task.punctuation === '.';
      const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || task._priority || 0);
      // For this demo, we'll trigger on any belief for demonstration purposes
      return isBelief && priority > 0.1; // Lower threshold for demo
    },
    lmPromptTemplate: (task) => {
      return `Based on the belief "${task.term}", what is a related hypothesis that could either support or challenge this belief? Express it as a causal relationship if possible.`;
    },
    lmOutputProcessor: (lmResponse, originalTask) => {
      // Process the LM's hypothesis
      return lmResponse.trim();
    },
    taskGenerator: (processedOutput, originalTask) => {
      if (!processedOutput || !processedOutput.trim()) return null;
      
      // Convert the hypothesis to Narsese format
      let narseseHypothesis = processedOutput.trim();
      
      // If it's not already in Narsese format, try to convert it
      if (!narseseHypothesis.includes('==>') && !narseseHypothesis.includes('=') && !narseseHypothesis.includes('<=>')) {
        // Simple conversion - assume it's a potential implication
        narseseHypothesis = `(${originalTask.term.replace(/[.?]/g, '')} ==> ${narseseHypothesis.replace(/[.?]/g, '')}).`;
      }
      
      return [{
        term: narseseHypothesis,
        punctuation: '.',
        truth: { frequency: 0.6, confidence: 0.5 }  // Lower confidence for generated hypotheses
      }];
    }
  });
  
  // Rule 3: Variable Grounding - When there are variables in tasks, 
  // use the LM to suggest possible values
  addIntegrationRule({
    description: "Variable Grounding Rule",
    premiseCriteria: (task) => {
      // Check if the task contains a variable (indicated by ?X pattern)
      return task.term && task.term.includes('?');
    },
    lmPromptTemplate: (task) => {
      return `For the task "${task.term}", what are 3 plausible values for the variable? Provide them as a list.`;
    },
    lmOutputProcessor: (lmResponse, originalTask) => {
      try {
        const lines = lmResponse.split('\n');
        const candidates = [];
        
        for (const line of lines) {
          const match = line.match(/\d+\.\s*(.+)/) || line.match(/[•*-]\s*(.+)/);
          if (match) {
            candidates.push(match[1].trim());
          }
        }
        
        // If no structured format found, try simple extraction
        if (candidates.length === 0) {
          // Try simple sentence splitting
          const sentences = lmResponse.split(/[.!?]+/);
          for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed && trimmed.length > 3) {
              candidates.push(trimmed);
            }
          }
        }
        
        return candidates;
      } catch (error) {
        console.error('Error processing variable grounding:', error);
        return [];
      }
    },
    taskGenerator: (processedOutput, originalTask) => {
      const newTasks = [];
      
      if (Array.isArray(processedOutput)) {
        for (const candidate of processedOutput) {
          if (candidate.trim()) {
            // Replace the variable with the candidate value
            const groundedTerm = originalTask.term.replace(/\?\w+/, candidate.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, ''));
            newTasks.push({
              term: groundedTerm,
              punctuation: originalTask.punctuation,
              truth: { frequency: 0.5, confidence: 0.4 }  // Lower confidence for generated values
            });
          }
        }
      }
      
      return newTasks;
    }
  });
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