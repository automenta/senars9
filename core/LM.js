/**
 * @file: core/LM.js
 * @description: Abstraction layer for interacting with language model providers for tasks like text generation, embedding, and hypothesis generation.
 * @module LM
 */

import Component from './Component.js';

class LM extends Component {
  constructor() {
    super();
    this.providers = new Map();
    this.defaultProviderId = null;
  }

  /**
   * Initializes the LM component.
   * @param {object} config - Configuration for the LM component, including providers.
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    await super.initialize(config);
    this.defaultProviderId = config.defaultProvider || null;
    // In a real implementation, provider instances would be created here based on config.
  }

  /**
   * Registers a language model provider.
   * @param {string} id - A unique identifier for the provider.
   * @param {object} provider - The provider instance, which should conform to a specific interface.
   */
  registerProvider(id, provider) {
    this.providers.set(id, provider);
    if (!this.defaultProviderId) {
      this.defaultProviderId = id;
    }
  }

  /**
   * Gets the active provider, either the default or a specified one.
   * @param {string|null} providerId - The ID of the provider to use.
   * @returns {object} The provider instance.
   * @private
   */
  _getProvider(providerId = null) {
    const id = providerId || this.defaultProviderId;
    if (!id || !this.providers.has(id)) {
      throw new Error(`LM provider "${id}" not found or no default provider is set.`);
    }
    return this.providers.get(id);
  }

  /**
   * Generates text using the configured language model.
   * @param {string} prompt - The prompt to send to the language model.
   * @param {object} options - Generation options (e.g., temperature, maxTokens).
   * @param {string|null} providerId - The specific provider to use.
   * @returns {Promise<string>} The generated text.
   */
  async generateText(prompt, options = {}, providerId = null) {
    const provider = this._getProvider(providerId);
    return provider.generateText(prompt, options);
  }

  /**
   * Generates an embedding vector for a given text.
   * @param {string} text - The text to embed.
   * @param {string|null} providerId - The specific provider to use.
   * @returns {Promise<Array<number>>} The embedding vector.
   */
  async generateEmbedding(text, providerId = null) {
    const provider = this._getProvider(providerId);
    return provider.generateEmbedding(text);
  }

  /**
   * Generates a hypothesis based on observations.
   * @param {Array<string>} observations - A list of observations.
   * @param {object} options - Options for hypothesis generation.
   * @param {string|null} providerId - The specific provider to use.
   * @returns {Promise<object>} The generated hypothesis.
   */
  async generateHypothesis(observations, options = {}, providerId = null) {
    const provider = this._getProvider(providerId);
    if (typeof provider.generateHypothesis !== 'function') {
      throw new Error(`Provider "${providerId || this.defaultProviderId}" does not support hypothesis generation.`);
    }
    return provider.generateHypothesis(observations, options);
  }
}

export default LM;