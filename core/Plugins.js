/**
 * @file: core/Plugins.js
 * @description: Manages the dynamic loading, unloading, and lifecycle of plugins to extend system capabilities.
 * @module Plugins
 */

import Component from './Component.js';

class Plugins extends Component {
  constructor() {
    super();
    this.plugins = new Map();
  }

  /**
   * Initializes the Plugins component.
   * @param {object} config - Configuration for the component.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.plugins.clear();
    // In a real implementation, this could auto-load plugins from a directory.
  }

  /**
   * Loads and installs a plugin.
   * @param {object} plugin - The plugin object to load. It must have an 'id' and an 'install' method.
   * @returns {Promise<void>}
   */
  async loadPlugin(plugin) {
    if (!plugin || !plugin.id || typeof plugin.install !== 'function') {
      throw new Error('Plugin must have an id and an install method.');
    }
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already loaded.`);
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

  /**
   * Unloads and uninstalls a plugin.
   * @param {string} pluginId - The ID of the plugin to unload.
   * @returns {Promise<void>}
   */
  async unloadPlugin(pluginId) {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is not loaded.`);
    }
    const plugin = this.plugins.get(pluginId);

    if (typeof plugin.uninstall === 'function') {
      try {
        await plugin.uninstall(this.core);
      } catch (error) {
        console.error(`Error during uninstall of plugin "${pluginId}":`, error);
      }
    }

    this.plugins.delete(pluginId);
    this.emit('plugin.unloaded', { id: pluginId });
  }

  /**
   * Retrieves a loaded plugin by its ID.
   * @param {string} pluginId - The ID of the plugin to retrieve.
   * @returns {object|undefined} The plugin object.
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  /**
   * Retrieves a list of all loaded plugins.
   * @returns {Array<object>} A list of plugin metadata.
   */
  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      version: p.version || 'N/A',
      description: p.description || 'No description',
    }));
  }
}

export default Plugins;