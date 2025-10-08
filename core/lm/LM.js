import Component from '../Component.js';

class LM extends Component {
  constructor() {
    super();
    this.providers = new Map();
    this.defaultProviderId = null;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.defaultProviderId = config.defaultProvider || null;
  }

  registerProvider(id, provider) {
    this.providers.set(id, provider);
    if (!this.defaultProviderId) {
      this.defaultProviderId = id;
    }
  }

  _getProvider(providerId = null) {
    const id = providerId || this.defaultProviderId;
    if (!id || !this.providers.has(id)) {
      throw new Error(`${this.constructor.name}: Provider "${id}" not found or no default provider is set.`);
    }
    return this.providers.get(id);
  }

  async generateText(prompt, options = {}, providerId = null) {
    return this._getProvider(providerId).generateText(prompt, options);
  }

  async generateEmbedding(text, providerId = null) {
    return this._getProvider(providerId).generateEmbedding(text);
  }

  async generateHypothesis(observations, options = {}, providerId = null) {
    const provider = this._getProvider(providerId);
    if (typeof provider.generateHypothesis !== 'function') {
      throw new Error(`${this.constructor.name}: Provider "${providerId || this.defaultProviderId}" does not support hypothesis generation.`);
    }
    return provider.generateHypothesis(observations, options);
  }
}

export default LM;