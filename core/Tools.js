import Component from './Component.js';
import { Storage, Validation, ErrorHandler } from './Utils.js';

class Tools extends Component {
  constructor() {
    super();
    this.tools = new Storage();
  }

  async _doInitialize() {
    this.tools.clear();
  }

  registerTool(tool) {
    Validation.validateTool(tool);

    this.tools.has(tool.id) && console.warn(`Tool "${tool.id}" already registered. Overwriting.`);
    this.tools.set(tool.id, tool);
  }

  async execute(toolId, params = {}) {
    const tool = Validation.ensureExists(this.tools.get(toolId), toolId, 'Tool');

    tool.parameters?.forEach(param => {
      param.required && !(param.name in params) &&
        (() => { throw new Error(`Missing required parameter "${param.name}" for tool "${toolId}".`); })();
    });

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