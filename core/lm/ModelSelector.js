class ModelSelector {
  constructor(providerRegistry) {
    this.providerRegistry = providerRegistry;
    this.cache = new Map();
    this.ttl = 300000; // 5 minutes
  }

  async select(task, constraints = {}) {
    const cacheKey = `${task.type}-${JSON.stringify(constraints)}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.ttl) return cached.model;
      this.cache.delete(cacheKey);
    }

    const availableModels = this.getAvailableModels();
    const modelType = {
      'reasoning': 'reasoningModel',
      'embedding': 'embeddingModel',
      'fast_response': 'fastModel',
      'temporal': 'temporalModel',
      'counterfactual': 'counterfactualModel'
    }[task.type];
    
    const result = modelType && availableModels.has(modelType) 
      ? availableModels.get(modelType) 
      : this.providerRegistry.get();
    
    this.cache.set(cacheKey, { model: result, timestamp: Date.now() });
    return result;
  }

  getAvailableModels() {
    const availableModels = new Map();
    
    for (const [id, provider] of this.providerRegistry.providers) {
      if (provider.generateEmbedding) availableModels.set('embeddingModel', provider);
      if (/reasoning|reasoner/.test(id)) availableModels.set('reasoningModel', provider);
      if (/fast|quick/.test(id)) availableModels.set('fastModel', provider);
      if (/temporal/.test(id)) availableModels.set('temporalModel', provider);
      if (/counterfactual|hypothetical/.test(id)) availableModels.set('counterfactualModel', provider);
      availableModels.set('generalModel', provider);
    }
    
    return availableModels;
  }

  clearCache() {
    this.cache.clear();
  }
}

export default ModelSelector;