import ModelSelector from './ModelSelector.js';

class ReasoningEngine {
  constructor(providerRegistry, ioAdapters) {
    this.providerRegistry = providerRegistry;
    this.ioAdapters = ioAdapters;
    this.modelSelector = new ModelSelector(providerRegistry);
  }

  async temporal(scenario, timeline) {
    return this._processWithProvider(scenario, 'temporal', 'Analyze the temporal relationships in: ');
  }

  async counterfactual(scenario) {
    return this._processWithProvider(scenario, 'counterfactual', 'Consider this counterfactual scenario: ');
  }

  async causal(cause, effect) {
    return this._processWithProvider(`${cause} -> ${effect}`, 'causal', 'Analyze the causal relationship: ');
  }

  async _processWithProvider(scenario, type, promptPrefix) {
    const model = await this.modelSelector.select({ type });
    const result = await model.generateText(`${promptPrefix}${scenario}`);
    return this.ioAdapters.narseseConverter.convertToNarsese(result, type);
  }
}

export default ReasoningEngine;