import { System } from './core/index.js';
import { Task, TruthValue } from './core/Task.js';
import { Term } from './core/Term.js';

class WebSocketClient {
  constructor() {
    this.system = null;
    this.isConnected = false;
    this.systemInitialized = false;
  }

  async connect() {
    try {
      // Initialize the SeNARS system
      this.system = new System();
      
      // Use a minimal configuration to avoid heavy dependencies
      const config = {
        components: {
          webSocketServer: {
            enabled: false  // Disable internal WebSocket server since we're using external one
          }
        }
      };
      
      await this.system.start();
      this.isConnected = true;
      this.systemInitialized = true;
      
      console.log('WebSocketClient: Connected to SeNARS system');
      
      // Set up event listeners to forward system events to WebSocket server
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('WebSocketClient: Failed to connect to SeNARS system:', error);
      return false;
    }
  }

  setupEventListeners() {
    if (!this.system) return;

    // Listen for various system events and forward them appropriately
    this.system.on('task.input', (task) => {
      console.log('Task input event:', task);
      this.forwardTaskEvent('task_input', task);
    });

    this.system.on('task.derived', (task) => {
      console.log('Task derived event:', task);
      this.forwardTaskEvent('task_derived', task);
    });

    this.system.on('concept.updated', (concept) => {
      console.log('Concept updated event:', concept);
      this.forwardConceptEvent('concept_updated', concept);
    });

    this.system.on('cycle.start', () => {
      console.log('Cycle started');
      this.forwardSystemEvent('cycle_started');
    });

    this.system.on('cycle.end', () => {
      console.log('Cycle ended');
      this.forwardSystemEvent('cycle_ended');
    });

    this.system.on('reasoning_error', (error) => {
      console.error('Reasoning error:', error);
      this.forwardSystemEvent('reasoning_error', { error: error.message });
    });
  }

  forwardTaskEvent(eventType, task) {
    // This would forward to the WebSocket server when one is connected
    // In a real implementation, you'd emit this to a WebSocket connection
    console.log(`Forwarding ${eventType}:`, task);
  }

  forwardConceptEvent(eventType, concept) {
    // This would forward to the WebSocket server when one is connected
    console.log(`Forwarding ${eventType}:`, concept);
  }

  forwardSystemEvent(eventType, data = {}) {
    // This would forward to the WebSocket server when one is connected
    console.log(`Forwarding ${eventType}:`, data);
  }

  async addTask(content, priority = 0.5) {
    if (!this.systemInitialized || !this.system) {
      throw new Error('System not initialized');
    }

    try {
      // Parse the content to create a proper task
      let term;
      let truth = new TruthValue(0.8, 0.8);
      
      // Simplified parsing for NARS-style content
      const cleanContent = content.replace(/[.!?:]+$/, '').trim();
      
      // Try to identify if it's an inheritance statement like (a-->b)
      const inheritanceMatch = cleanContent.match(/\(([^(]+)-->([^)]+)\)/);
      if (inheritanceMatch) {
        const subject = inheritanceMatch[1].trim();
        const predicate = inheritanceMatch[2].trim();
        const subjTerm = Term.newAtom(subject);
        const predTerm = Term.newAtom(predicate);
        term = Term.createCompound(0, [subjTerm, predTerm]); // 0 likely corresponds to inheritance
      } else {
        term = Term.newAtom(cleanContent);
      }

      // Determine punctuation based on original content
      let punctuation = '.';
      if (content.endsWith('!')) punctuation = '!';
      else if (content.endsWith('?')) punctuation = '?';

      // Create task using the system's input method which handles the format properly
      const taskData = {
        term: content, // Pass the original content as term
        punctuation: punctuation,
        truth: truth,
        priority: priority
      };

      // Input the task to the system (this will create the proper internal task structure)
      const result = this.system.input(taskData);
      
      return {
        success: true,
        taskId: result.id || `task_${Date.now()}`,
        content: content,
        priority: priority
      };
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  async executeCommand(command, data = {}) {
    if (!this.systemInitialized || !this.system) {
      throw new Error('System not initialized');
    }

    try {
      switch (command) {
        case 'start':
          // In a real implementation, this would start the reasoning cycle
          console.log('Start command executed');
          return { success: true, command: 'start' };
          
        case 'stop':
          // In a real implementation, this would stop the reasoning cycle
          console.log('Stop command executed');
          return { success: true, command: 'stop' };
          
        case 'step':
          // In a real implementation, this would execute a single reasoning step
          console.log('Step command executed');
          return { success: true, command: 'step' };
          
        case 'reset':
          // In a real implementation, this would reset the system
          console.log('Reset command executed');
          return { success: true, command: 'reset' };
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      throw error;
    }
  }

  getSystemStatus() {
    if (!this.systemInitialized || !this.system) {
      return {
        isConnected: false,
        error: 'System not initialized'
      };
    }

    try {
      const status = this.system.getStatus();
      return {
        isConnected: this.isConnected,
        ...status
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  async disconnect() {
    if (this.system) {
      try {
        await this.system.stop();
        this.system = null;
        this.isConnected = false;
        this.systemInitialized = false;
        console.log('WebSocketClient: Disconnected from SeNARS system');
      } catch (error) {
        console.error('Error disconnecting from system:', error);
      }
    }
  }
}

// Export the WebSocketClient class
export { WebSocketClient };

// If this file is run directly, demonstrate its usage
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('WebSocketClient module loaded');
  
  // Example usage would go here
  // This module is intended to be imported by the WebSocket server
}