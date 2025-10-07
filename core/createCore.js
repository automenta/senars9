/**
 * @file: core/createCore.js
 * @description: Factory function for creating and initializing a SeNARS Core instance.
 * @module createCore
 */

import Core from './Core.js';

/**
 * Creates, configures, and initializes a new Core instance.
 * This function simplifies the setup process by handling instantiation
 * and asynchronous initialization.
 *
 * @param {object} [config={}] - The initial configuration for the system.
 * @returns {Promise<Core>} A promise that resolves to the fully initialized Core instance.
 */
async function createCore(config = {}) {
  const core = new Core();
  await core.initialize(config);
  return core;
}

export default createCore;