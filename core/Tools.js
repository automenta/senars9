import Component from './Component.js';
import { Storage } from './Utils.js';

class Tools extends Component {
  constructor() {
    super();
    this.tools = new Storage();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.tools.clear();
  }

  registerTool(tool) {
    if (!tool?.id || typeof tool.execute !== 'function') {
      throw new Error('Tool must have an id and an execute method.');
    }
    if (this.tools.has(tool.id)) {
      console.warn(`Tool with ID "${tool.id}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.id, tool);
  }

  async execute(toolId, params = {}) {
    if (!this.tools.has(toolId)) {
      throw new Error(`Tool with ID "${toolId}" not found.`);
    }
    const tool = this.tools.get(toolId);

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
      throw error;
    }
  }

  getAvailableTools() {
    return Array.from(this.tools.values()).map(tool => ({
      id: tool.id,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}

export default Tools;