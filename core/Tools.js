/**
 * @file: core/Tools.js
 * @description: Provides a framework for executing external actions (tools) in a safe and controlled manner.
 * @module Tools
 */

import Component from './Component.js';

class Tools extends Component {
  constructor() {
    super();
    this.tools = new Map();
  }

  /**
   * Initializes the Tools component.
   * @param {object} config - Configuration for the component.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.tools.clear();
    // In a real implementation, tools could be loaded from a directory or configuration.
  }

  /**
   * Registers a new tool with the component.
   * @param {object} tool - The tool to register. It should have an 'id' and an 'execute' method.
   */
  registerTool(tool) {
    if (!tool || !tool.id || typeof tool.execute !== 'function') {
      throw new Error('Tool must have an id and an execute method.');
    }
    if (this.tools.has(tool.id)) {
      console.warn(`Tool with ID "${tool.id}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.id, tool);
  }

  /**
   * Executes a registered tool by its ID.
   * @param {string} toolId - The ID of the tool to execute.
   * @param {object} params - The parameters to pass to the tool's execute method.
   * @returns {Promise<any>} The result of the tool's execution.
   */
  async execute(toolId, params = {}) {
    if (!this.tools.has(toolId)) {
      throw new Error(`Tool with ID "${toolId}" not found.`);
    }
    const tool = this.tools.get(toolId);

    // Basic parameter validation (can be extended)
    if (tool.parameters) {
      for (const param of tool.parameters) {
        if (param.required && !(param.name in params)) {
          throw new Error(`Missing required parameter "${param.name}" for tool "${toolId}".`);
        }
      }
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      console.error(`Error executing tool "${toolId}":`, error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  /**
   * Retrieves a list of all available tools.
   * @returns {Array<object>} A list of tool definitions.
   */
  getAvailableTools() {
    return Array.from(this.tools.values()).map(tool => ({
      id: tool.id,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}

export default Tools;