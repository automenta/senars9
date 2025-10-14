import { System } from './core/index.js';
import { Task, TruthValue } from './core/Task.js';
import { Term } from './core/Term.js';

/**
 * WebSocketClient for external applications to connect to the SeNARS core system
 * This is used by the UI and other non-UI WebSocket client applications
 */
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
      
      return true;
    } catch (error) {
      console.error('WebSocketClient: Failed to connect to SeNARS system:', error);
      return false;
    }
  }

  async addTask(content, priority = 0.5) {
    if (!this.systemInitialized || !this.system) {
      throw new Error('System not initialized');
    }

    try {
      // Create task using the system's input method which handles the format properly
      const taskData = {
        term: content, // Pass the original content as term
        punctuation: content.endsWith('!') ? '!' : content.endsWith('?') ? '?' : '.',
        truth: new TruthValue(0.8, 0.8),
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
  // This module is intended to be imported by WebSocket clients
}