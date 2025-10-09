// LM Configuration class to manage provider and model settings
class LMConfiguration {
  constructor(config = {}) {
    this.providers = config.providers || [];
    this.models = config.models || [];
    this.defaults = config.defaults || {};
    this.preferences = config.preferences || {};
  }

  // Provider management
  addProvider(provider) {
    // Validate provider has required fields
    if (!provider.name) throw new Error('Provider must have a name');
    if (!provider.url) throw new Error('Provider must have a URL');
    
    // Check for duplicate names
    if (this.providers.some(p => p.name === provider.name)) {
      throw new Error(`Provider with name "${provider.name}" already exists`);
    }
    
    this.providers.push(provider);
    return this;
  }

  removeProvider(name) {
    const index = this.providers.findIndex(p => p.name === name);
    if (index !== -1) {
      this.providers.splice(index, 1);
    }
    return this;
  }

  getProvider(name) {
    return this.providers.find(p => p.name === name);
  }

  // Model management
  addModel(model) {
    // Validate model has required fields
    if (!model.name) throw new Error('Model must have a name');
    if (!model.provider) throw new Error('Model must have a provider');
    
    // Check for duplicate names
    if (this.models.some(m => m.name === model.name)) {
      throw new Error(`Model with name "${model.name}" already exists`);
    }
    
    this.models.push(model);
    return this;
  }

  removeModel(name) {
    const index = this.models.findIndex(m => m.name === name);
    if (index !== -1) {
      this.models.splice(index, 1);
    }
    return this;
  }

  getModel(name) {
    return this.models.find(m => m.name === name);
  }

  // Default assignments
  setDefault(type, name) {
    if (!['embedding', 'fast', 'reasoning', 'temporal', 'counterfactual'].includes(type)) {
      throw new Error(`Invalid default type: ${type}`);
    }
    
    // Validate that the named model/provider exists
    if (type === 'embedding' || type === 'fast' || type === 'reasoning' || 
        type === 'temporal' || type === 'counterfactual') {
      if (!this.getModel(name) && !this.getProvider(name)) {
        throw new Error(`Model or Provider with name "${name}" does not exist`);
      }
    }
    
    this.defaults[type] = name;
    return this;
  }

  getDefault(type) {
    return this.defaults[type];
  }

  // Preferences
  setPreference(key, value) {
    this.preferences[key] = value;
    return this;
  }

  getPreference(key, defaultValue) {
    return this.preferences[key] !== undefined ? this.preferences[key] : defaultValue;
  }

  // Serialization
  toJSON() {
    return {
      providers: this.providers,
      models: this.models,
      defaults: this.defaults,
      preferences: this.preferences
    };
  }

  // Create a new configuration from JSON
  static fromJSON(json) {
    return new LMConfiguration(json);
  }

  // Clone the configuration
  clone() {
    return new LMConfiguration(this.toJSON());
  }

  // Validate the entire configuration
  validate() {
    const errors = [];

    // Validate providers
    for (const provider of this.providers) {
      if (!provider.name) errors.push('Provider missing name');
      if (!provider.url) errors.push('Provider missing URL');
    }

    // Validate models
    for (const model of this.models) {
      if (!model.name) errors.push('Model missing name');
      if (!model.provider) errors.push('Model missing provider');
      // Check if the referenced provider exists
      if (!this.getProvider(model.provider)) {
        errors.push(`Model "${model.name}" references non-existent provider "${model.provider}"`);
      }
    }

    // Validate defaults
    for (const [type, name] of Object.entries(this.defaults)) {
      if (!['embedding', 'fast', 'reasoning', 'temporal', 'counterfactual'].includes(type)) {
        errors.push(`Invalid default type: ${type}`);
      } else if (!this.getModel(name) && !this.getProvider(name)) {
        errors.push(`Default ${type} references non-existent model or provider "${name}"`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    return true;
  }
}

export default LMConfiguration;