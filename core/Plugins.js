import Component from './Component.js';
import { Validation } from './Utils.js';

class Plugins extends Component {
  constructor() {
    super();
    this.plugins = new Map();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.plugins.clear();
  }

  async loadPlugin(plugin) {
    Validation.validatePlugin(plugin);

    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" already loaded`);
      return;
    }

    try {
      await plugin.install(this.core);
      this.plugins.set(plugin.id, plugin);
      this.emit('plugin.loaded', { id: plugin.id });
    } catch (error) {
      console.error(`Failed to load plugin "${plugin.id}":`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId) {
    const plugin = this.plugins.has(pluginId) ? this.plugins.get(pluginId) : (() => { throw new Error(`Plugin "${pluginId}" is not loaded.`); })();

    if (typeof plugin.uninstall === 'function') {
      try {
        await plugin.uninstall(this.core);
      } catch (error) {
        console.error(`Error uninstalling plugin "${pluginId}":`, error);
      }
    }

    this.plugins.delete(pluginId);
    this.emit('plugin.unloaded', { id: pluginId });
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      version: p.version || 'N/A',
      description: p.description || 'No description',
    }));
  }
}

export default Plugins;